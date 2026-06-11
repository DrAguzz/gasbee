import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Phone, Navigation, MapPin, Package, Home, Check, Loader2, MapPinOff, ShieldAlert } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { SwipeSlider } from "@/components/SwipeSlider";
import { ensureLocationPermission, startLocationWatch, type GpsStatus, type WatchHandle } from "@/lib/riderTracking";

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
  const watchRef = useRef<WatchHandle | null>(null);
  const orderChannelsRef = useRef<Record<string, RealtimeChannel>>({});
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const lastSentRef = useRef<number>(0);

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

  // Start native/web GPS tracking once rider has at least one active job
  useEffect(() => {
    let cancelled = false;
    const stop = async () => {
      if (watchRef.current) { await watchRef.current.stop(); watchRef.current = null; }
    };
    if (!rider || orders.length === 0) { setGpsStatus("idle"); stop(); return; }

    const broadcastLocation = (lat: number, lng: number) => {
      Object.keys(orderChannelsRef.current).forEach((orderId) => {
        const ch = orderChannelsRef.current[orderId];
        if (ch) {
          ch.send({
            type: "broadcast",
            event: "location",
            payload: { lat, lng }
          }).catch((err) => {
            console.error(`Broadcast error on order-${orderId}:`, err);
          });
        }
      });
    };

    (async () => {
      setGpsStatus("searching");
      const perm = await ensureLocationPermission();
      if (cancelled) return;
      if (!perm.granted) {
        setGpsStatus(perm.status);
        toast.error("Location permission is required to continue this delivery.");
        return;
      }
      const handle = await startLocationWatch(
        async (pos) => {
          broadcastLocation(pos.lat, pos.lng);
          // Throttle DB updates to once every ~5s
          const now = Date.now();
          if (now - lastSentRef.current < 5000) return;
          lastSentRef.current = now;
          const { error } = await supabase
            .from("riders")
            .update({ current_lat: pos.lat, current_lng: pos.lng })
            .eq("id", rider.id);
          if (error) console.error("[riderTracking] failed to push location", error);
        },
        (s) => { if (!cancelled) setGpsStatus(s); }
      );
      if (cancelled) { await handle?.stop(); return; }
      watchRef.current = handle;
    })();

    return () => { cancelled = true; stop(); };
  }, [rider?.id, orders.length]);

  const advance = async (o: any) => {
    const next = FLOW[o.status];
    if (!next) return;
    const stamp: any = {};
    if (next === "picked_up") stamp.picked_up_at = new Date().toISOString();
    if (next === "delivered") {
      const proof = proofUrls[o.id];
      if (!proof) { toast.error("Upload proof of delivery photo first."); return; }
      if (o.payment_method === "cod" && o.payment_status !== "paid") {
        toast.error("Sila sahkan kutipan tunai terlebih dahulu menggunakan slider.");
        return;
      }
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
      {orders.length > 0 && (() => {
        const map: Record<GpsStatus, { cls: string; icon: any; text: string }> = {
          idle: { cls: "bg-muted text-muted-foreground", icon: MapPinOff, text: "GPS idle" },
          searching: { cls: "bg-amber-500/10 text-amber-700", icon: Loader2, text: "Searching for GPS signal…" },
          active: { cls: "bg-emerald-500/10 text-emerald-700", icon: MapPin, text: "GPS active — sharing live location" },
          permission_required: { cls: "bg-amber-500/10 text-amber-700", icon: ShieldAlert, text: "Location permission required" },
          permission_denied: { cls: "bg-destructive/10 text-destructive", icon: ShieldAlert, text: "Location permission denied — enable in settings" },
          service_disabled: { cls: "bg-destructive/10 text-destructive", icon: MapPinOff, text: "Please turn on your phone location/GPS to continue delivery." },
          error: { cls: "bg-destructive/10 text-destructive", icon: MapPinOff, text: "GPS error — please check device location" },
        };
        const s = map[gpsStatus];
        const Icon = s.icon;
        return (
          <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${s.cls}`}>
            <Icon className={`h-4 w-4 ${gpsStatus === "searching" ? "animate-spin" : ""}`} />
            <span>{s.text}</span>
            {(gpsStatus === "permission_denied" || gpsStatus === "service_disabled") && (
              <Button size="sm" variant="outline" className="ml-auto h-7" onClick={async () => {
                const p = await ensureLocationPermission();
                setGpsStatus(p.status);
              }}>Retry</Button>
            )}
          </div>
        );
      })()}
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

            {o.status === "arrived_at_customer" && o.payment_method === "cod" && (
              <div className="rounded border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Peringatan Kutipan Tunai (COD)</p>
                {o.payment_status === "paid" ? (
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-lg">
                    <Check className="h-4 w-4" /> Wang tunai RM{Number(o.total_amount).toFixed(2)} telah dikutip.
                  </div>
                ) : (
                  <SwipeSlider
                    amount={Number(o.total_amount)}
                    label="Geser jika sudah terima tunai"
                    onConfirm={async () => {
                      const { error } = await supabase
                        .from("orders")
                        .update({ payment_status: "paid" })
                        .eq("id", o.id);
                      if (error) {
                        toast.error(error.message);
                      } else {
                        toast.success("Tunai disahkan telah diterima!");
                        load();
                      }
                    }}
                  />
                )}
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
