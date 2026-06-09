import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Phone, Navigation, MapPin, Package, Home } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

const FLOW: Record<string, string> = {
  assigned: "arrived_at_merchant",
  rider_accepted: "arrived_at_merchant",
  arrived_at_merchant: "picked_up",
  picked_up: "on_delivery",
  on_delivery: "arrived_at_customer",
  arrived_at_customer: "delivered",
};

const PRE_PICKUP = new Set(["assigned", "rider_accepted", "arrived_at_merchant"]);

export default function RiderActive() {
  const { user } = useAuth();
  const [rider, setRider] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<Record<string, any>>({});
  const [proofUrls, setProofUrls] = useState<Record<string, string | null>>({});
  const watchRef = useRef<any>(null);
  const webWatchRef = useRef<number | null>(null);
  const orderChannelsRef = useRef<Record<string, RealtimeChannel>>({});

  const load = async () => {
    if (!user) return;
    const { data: r } = await supabase.from("riders").select("*").eq("user_id", user.id).maybeSingle();
    setRider(r);
    if (!r) return;
    const { data } = await supabase.from("orders").select("*").eq("rider_id", r.id).in("status", ["rider_accepted","arrived_at_merchant","picked_up","on_delivery","arrived_at_customer"]).order("created_at", { ascending: false });
    setOrders(data ?? []);
    // load proof urls already on order
    const init: Record<string, string | null> = {};
    (data ?? []).forEach((o: any) => { init[o.id] = o.proof_of_delivery_url ?? null; });
    setProofUrls(init);
    // fetch merchants for pickup nav
    const merchantIds = Array.from(new Set((data ?? []).map((o: any) => o.merchant_id)));
    if (merchantIds.length) {
      const { data: ms } = await supabase.from("merchants").select("id,name,latitude,longitude,address,phone").in("id", merchantIds);
      const map: Record<string, any> = {};
      (ms ?? []).forEach((m: any) => { map[m.id] = m; });
      setMerchants(map);
    }
  };
  useEffect(() => { load(); }, [user?.id]);

  // Realtime: refresh when an order is assigned to / updated for this rider
  useEffect(() => {
    if (!rider?.id) return;
    const ch = supabase
      .channel(`rider-active-${rider.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `rider_id=eq.${rider.id}` }, (p) => {
        const nu: any = p.new; const ol: any = p.old;
        if (ol?.rider_id !== nu.rider_id) {
          toast.success(`🛵 New job assigned: ${nu.code}`);
        }
        load();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `rider_id=eq.${rider.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [rider?.id]);

  // Manage broadcast channels for active orders
  useEffect(() => {
    if (!orders.length) {
      // Clean up all channels
      Object.keys(orderChannelsRef.current).forEach((id) => {
        supabase.removeChannel(orderChannelsRef.current[id]);
      });
      orderChannelsRef.current = {};
      return;
    }

    const activeOrderIds = new Set(orders.map((o) => o.id));

    // Clean up channels that are no longer active
    Object.keys(orderChannelsRef.current).forEach((id) => {
      if (!activeOrderIds.has(id)) {
        supabase.removeChannel(orderChannelsRef.current[id]);
        delete orderChannelsRef.current[id];
      }
    });

    // Create channels for new active orders
    orders.forEach((o) => {
      if (!orderChannelsRef.current[o.id]) {
        console.log("Subscribing to channel order-", o.id);
        const ch = supabase.channel(`order-${o.id}`).subscribe((status) => {
          console.log(`Channel order-${o.id} subscription status:`, status);
        });
        orderChannelsRef.current[o.id] = ch;
      }
    });

    return () => {
      // Clean up all channels on unmount
      Object.keys(orderChannelsRef.current).forEach((id) => {
        supabase.removeChannel(orderChannelsRef.current[id]);
      });
      orderChannelsRef.current = {};
    };
  }, [orders]);

  useEffect(() => {
    if (!rider || orders.length === 0) return;
    
    let active = true;

    const broadcastLocation = (lat: number, lng: number) => {
      Object.keys(orderChannelsRef.current).forEach((orderId) => {
        const ch = orderChannelsRef.current[orderId];
        if (ch) {
          console.log(`Broadcasting location to order-${orderId}:`, lat, lng);
          ch.send({
            type: "broadcast",
            event: "location",
            payload: { lat, lng }
          }).then((res) => {
            console.log(`Broadcast send result to order-${orderId}:`, res);
          }).catch((err) => {
            console.error(`Broadcast error on order-${orderId}:`, err);
          });
        }
      });
    };

    const startWatching = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          console.log("RiderActive: Checking location permissions...");
          let permStatus = await Geolocation.checkPermissions();
          console.log("RiderActive: Geolocation permission check result:", JSON.stringify(permStatus));
          if (permStatus.location !== "granted") {
            console.log("RiderActive: Location permission not granted. Requesting...");
            permStatus = await Geolocation.requestPermissions();
            console.log("RiderActive: Geolocation permission request result:", JSON.stringify(permStatus));
          }
          if (permStatus.location !== "granted") {
            console.warn("RiderActive: Location permission denied.");
            toast.error("Kebenaran lokasi ditolak. Sila benarkan akses lokasi untuk mengemas kini kedudukan anda.");
            return;
          }

          if (!active) return;
          console.log("RiderActive: Starting location watch via Capacitor...");
          const id = await Geolocation.watchPosition(
            { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 },
            async (position, err) => {
              if (err) {
                console.error("RiderActive watch error:", err);
                return;
              }
              if (position && active) {
                console.log("RiderActive location update:", position.coords.latitude, position.coords.longitude);
                await supabase.from("riders").update({ 
                  current_lat: position.coords.latitude, 
                  current_lng: position.coords.longitude 
                }).eq("id", rider.id);
                broadcastLocation(position.coords.latitude, position.coords.longitude);
              }
            }
          );
          watchRef.current = id;
        } catch (error) {
          console.error("RiderActive Geolocation error:", error);
        }
      } else {
        if (!navigator.geolocation) return;
        console.log("RiderActive: Starting location watch via browser navigator...");
        const id = navigator.geolocation.watchPosition(
          async (pos) => {
            if (active) {
              console.log("RiderActive web location update:", pos.coords.latitude, pos.coords.longitude);
              await supabase.from("riders").update({ 
                current_lat: pos.coords.latitude, 
                current_lng: pos.coords.longitude 
              }).eq("id", rider.id);
              broadcastLocation(pos.coords.latitude, pos.coords.longitude);
            }
          },
          (err) => {
            console.error("RiderActive web watch error:", err);
          },
          { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 }
        );
        webWatchRef.current = id;
      }
    };

    startWatching();

    return () => {
      active = false;
      if (watchRef.current !== null) {
        console.log("Clearing Capacitor location watch:", watchRef.current);
        const idToClear = watchRef.current;
        Geolocation.clearWatch({ id: idToClear }).catch(err => console.error("Error clearing watch:", err));
        watchRef.current = null;
      }
      if (webWatchRef.current !== null && navigator.geolocation) {
        console.log("Clearing web location watch:", webWatchRef.current);
        navigator.geolocation.clearWatch(webWatchRef.current);
        webWatchRef.current = null;
      }
    };
  }, [rider?.id, orders.length]);

  const advance = async (o: any) => {
    const next = FLOW[o.status];
    if (!next) return;
    const stamp: any = {};
    if (next === "picked_up") stamp.picked_up_at = new Date().toISOString();
    if (next === "delivered") {
      const proof = proofUrls[o.id];
      if (!proof) { toast.error("Upload proof of delivery photo first."); return; }
      stamp.delivered_at = new Date().toISOString();
      stamp.proof_of_delivery_url = proof;
    }
    const { error } = await supabase.from("orders").update({ status: next as any, ...stamp }).eq("id", o.id);
    if (error) toast.error(error.message); else { toast.success(`Marked ${next.replace(/_/g," ")}`); load(); }
  };

  const navTo = (lat: any, lng: any, fallback: string) => {
    if (lat != null && lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallback)}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Active deliveries</h1>
        <Button asChild variant="outline" size="sm"><Link to="/merchant/rider/refund-pickups">Refund pickups</Link></Button>
      </div>
      {orders.length === 0 && <p className="text-sm text-muted-foreground">No active delivery.</p>}
      {orders.map((o) => {
        const a = o.address_snapshot ?? {};
        const m = merchants[o.merchant_id];
        const phase = PRE_PICKUP.has(o.status) ? "pickup" : "delivery";
        const navUrl = phase === "pickup"
          ? navTo(m?.latitude, m?.longitude, `${m?.name ?? "merchant"} ${m?.address ?? ""}`)
          : navTo(a.latitude, a.longitude, `${a.address_line1 ?? ""} ${a.city ?? ""}`);
        const callPhone = phase === "pickup" ? m?.phone : a.recipient_phone;
        const showProof = o.status === "arrived_at_customer";

        return (
          <Card key={o.id} className="space-y-2 p-4">
            <div className="flex justify-between"><span className="font-mono">{o.code}</span><span className="text-xs uppercase">{o.status.replace(/_/g," ")}</span></div>

            <div className={`rounded p-2 text-sm ${phase === "pickup" ? "bg-amber-500/10" : "bg-primary/10"}`}>
              {phase === "pickup" ? (
                <>
                  <div className="flex items-center gap-1 font-semibold"><Package className="h-3 w-3" /> Step 1: Pickup at merchant</div>
                  <div className="text-xs">{m?.name}</div>
                  <div className="text-xs text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3" />{m?.address}</div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 font-semibold"><Home className="h-3 w-3" /> Step 2: Deliver to customer</div>
                  <div className="text-xs">{a.recipient_name} — {a.recipient_phone}</div>
                  <div className="text-xs text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3" />{a.address_line1}, {a.city}</div>
                </>
              )}
            </div>

            {showProof && (
              <div className="rounded border-2 border-dashed border-primary p-3">
                <p className="mb-2 text-sm font-semibold">Proof of delivery (required)</p>
                <ImageUpload
                  bucket="delivery-proofs"
                  pathPrefix={`order-${o.id}`}
                  value={proofUrls[o.id] ?? null}
                  onChange={(url) => setProofUrls((p) => ({ ...p, [o.id]: url }))}
                  label="Upload photo"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="flex-1"><Link to={`/merchant/rider/jobs/${o.id}`}>Details / Chat</Link></Button>
              <Button asChild variant="outline" size="sm"><a href={navUrl} target="_blank" rel="noreferrer"><Navigation className="mr-1 h-3 w-3" />Navigate</a></Button>
              {callPhone && <Button asChild variant="outline" size="sm"><a href={`tel:${callPhone}`}><Phone className="mr-1 h-3 w-3" />Call</a></Button>}
              {FLOW[o.status] && <Button size="sm" className="flex-1" onClick={() => advance(o)}>Mark {FLOW[o.status].replace(/_/g," ")}</Button>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
