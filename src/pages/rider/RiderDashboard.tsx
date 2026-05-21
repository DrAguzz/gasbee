import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { playBeep } from "@/lib/sound";
import {
  Bike,
  MapPin,
  Navigation,
  Phone,
  Package,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

export default function RiderDashboard() {
  const { user } = useAuth();
  const [rider, setRider] = useState<any>(null);
  const [stats, setStats] = useState({ today: 0, earnings: 0, active: 0, available: 0 });
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<Record<string, any>>({});
  const [accepting, setAccepting] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const [pulseJobId, setPulseJobId] = useState<string | null>(null);

  const loadMerchants = async (merchantIds: string[]) => {
    if (!merchantIds.length) return;
    const { data: ms } = await supabase
      .from("merchants")
      .select("id,name,latitude,longitude,address,phone")
      .in("id", merchantIds);
    const map: Record<string, any> = {};
    (ms ?? []).forEach((m: any) => { map[m.id] = m; });
    setMerchants((prev) => ({ ...prev, ...map }));
  };

  const loadJobs = async (merchantId: string) => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("merchant_id", merchantId)
      .is("rider_id", null)
      .in("status", ["accepted", "preparing"])
      .order("created_at", { ascending: false });
    const newJobs = data ?? [];
    setJobs(newJobs);
    // detect brand-new jobs and pulse them
    newJobs.forEach((o: any) => {
      if (!seen.current.has(o.id)) {
        seen.current.add(o.id);
        setPulseJobId(o.id);
        setTimeout(() => setPulseJobId((curr) => curr === o.id ? null : curr), 4000);
      }
    });
    const mIds = Array.from(new Set(newJobs.map((o: any) => o.merchant_id)));
    await loadMerchants(mIds);
  };

  const loadActive = async (riderId: string) => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("rider_id", riderId)
      .in("status", ["assigned", "rider_accepted", "arrived_at_merchant", "picked_up", "on_delivery", "arrived_at_customer"])
      .order("created_at", { ascending: false });
    setActiveOrders(data ?? []);
    const mIds = Array.from(new Set((data ?? []).map((o: any) => o.merchant_id)));
    await loadMerchants(mIds);
  };

  const load = async () => {
    if (!user) return;
    const { data: r } = await supabase.from("riders").select("*").eq("user_id", user.id).maybeSingle();
    setRider(r);
    if (!r) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [del, act, avail] = await Promise.all([
      supabase.from("orders").select("total_amount,delivery_fee", { count: "exact" }).eq("rider_id", r.id).eq("status", "delivered").gte("delivered_at", today.toISOString()),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("rider_id", r.id).in("status", ["assigned", "rider_accepted", "arrived_at_merchant", "picked_up", "on_delivery", "arrived_at_customer"]),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("merchant_id", r.merchant_id).is("rider_id", null).in("status", ["accepted", "preparing"]),
    ]);
    const earnings = (del.data ?? []).reduce((s: number, o: any) => s + Number(o.delivery_fee || 0), 0);
    setStats({ today: del.count ?? 0, earnings, active: act.count ?? 0, available: avail.count ?? 0 });
    await Promise.all([loadJobs(r.merchant_id), loadActive(r.id)]);
  };
  useEffect(() => { load(); }, [user?.id]);

  // Realtime: new orders for this merchant
  useEffect(() => {
    if (!rider?.merchant_id) return;
    const ch = supabase
      .channel(`rider-orders-${rider.merchant_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `merchant_id=eq.${rider.merchant_id}` }, (p) => {
        const o: any = p.new || p.old;
        if (!o) return;
        if (p.eventType === "INSERT" && !seen.current.has(o.id)) {
          seen.current.add(o.id);
          playBeep(4);
          toast.success(`🛵 New job ${o.code}`, { description: "A new order is ready to grab.", duration: 8000 });
        }
        loadJobs(rider.merchant_id);
        loadActive(rider.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [rider?.merchant_id, rider?.id]);

  const toggleStatus = async (online: boolean) => {
    if (!rider) return;
    const status = online ? "online" : "offline";
    const { error } = await supabase.from("riders").update({ status }).eq("id", rider.id);
    if (error) toast.error(error.message); else { toast.success(online ? "Online" : "Offline"); load(); }
  };

  const licenseOk = rider?.license_image_url && (!rider?.license_expiry_date || new Date(rider.license_expiry_date) >= new Date());

  const accept = async (orderId: string) => {
    if (!rider) return;
    if (!licenseOk) { toast.error("Upload a valid driving license before accepting jobs."); return; }
    setAccepting(orderId);
    const { error } = await supabase.from("orders").update({ rider_id: rider.id, status: "rider_accepted" as any, assigned_at: new Date().toISOString() }).eq("id", orderId);
    setAccepting(null);
    if (error) toast.error(error.message); else { toast.success("Job accepted! Head to merchant for pickup."); load(); }
  };

  if (!rider) return <p className="text-sm text-muted-foreground">Rider profile not linked. Contact merchant.</p>;
  const fmt = (n: any) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n || 0));
  const isOnline = rider.status === "online";

  return (
    <div className="space-y-5">
      {/* ====== TOP: Status bar ====== */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Hello, {rider.full_name?.split(" ")[0] ?? "Rider"}</p>
          <p className="text-lg font-bold capitalize">{isOnline ? "Online & ready" : "Offline"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`relative flex h-3 w-3 ${isOnline ? "" : "hidden"}`}>
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${isOnline ? "bg-green-500" : ""}`}></span>
            <span className={`relative inline-flex h-3 w-3 rounded-full ${isOnline ? "bg-green-500" : "bg-muted"}`}></span>
          </span>
          <Switch checked={isOnline} onCheckedChange={toggleStatus} />
        </div>
      </div>

      {/* ====== INCOMING JOBS (most prominent) ====== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Incoming Jobs
            {jobs.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">{jobs.length} NEW</Badge>
            )}
          </h2>
          {stats.active > 0 && (
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/merchant/rider/active-delivery">Active ({stats.active}) <ChevronRight className="h-3 w-3" /></Link>
            </Button>
          )}
        </div>

        {rider && !licenseOk && (
          <Card className="border-destructive bg-destructive/10 p-3 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">License required</p>
              <p className="text-muted-foreground">
                {!rider.license_image_url ? "Your driving license has not been uploaded." : "Your driving license has expired."} Contact your merchant to update it.
              </p>
            </div>
          </Card>
        )}

        {jobs.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">
            <Bike className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No incoming jobs right now.</p>
            <p className="text-xs">Stay online — new jobs will appear here instantly.</p>
          </Card>
        )}

        {jobs.map((o) => {
          const a = o.address_snapshot ?? {};
          const m = merchants[o.merchant_id];
          const isPulsing = pulseJobId === o.id;
          return (
            <Card
              key={o.id}
              className={`overflow-hidden transition-all duration-300 ${isPulsing ? "ring-2 ring-primary ring-offset-2" : ""}`}
            >
              {/* Header */}
              <div className="bg-primary/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">{o.code}</Badge>
                  <span className="text-xs text-muted-foreground"><Clock className="inline h-3 w-3 mr-0.5" />{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <span className="text-sm font-bold text-primary flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />{fmt(o.delivery_fee)}
                </span>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                {/* Merchant pickup */}
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Package className="h-3 w-3 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pickup from</p>
                    <p className="text-sm font-semibold">{m?.name ?? "Merchant"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{m?.address ?? "—"}
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center gap-2 pl-3">
                  <div className="h-6 w-px bg-border" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Deliver to</span>
                </div>

                {/* Customer dropoff */}
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{a.recipient_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{a.recipient_phone ?? "—"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{a.address_line1}{a.city ? `, ${a.city}` : ""}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link to={`/merchant/rider/jobs/${o.id}`}>View Details</Link>
                  </Button>
                  {m?.latitude && m?.longitude && (
                    <Button asChild variant="outline" size="sm">
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}`} target="_blank" rel="noreferrer">
                        <Navigation className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                  {m?.phone && (
                    <Button asChild variant="outline" size="sm">
                      <a href={`tel:${m.phone}`}><Phone className="h-3.5 w-3.5" /></a>
                    </Button>
                  )}
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => accept(o.id)}
                  disabled={!licenseOk || accepting === o.id}
                >
                  {accepting === o.id ? "Accepting..." : "Accept Job"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ====== QUICK STATS ====== */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
          <p className="text-xl font-bold">{stats.today}</p>
          <p className="text-[10px] text-muted-foreground">Deliveries today</p>
        </Card>
        <Card className="p-3 text-center">
          <DollarSign className="h-4 w-4 mx-auto mb-1 text-green-500" />
          <p className="text-xl font-bold">{fmt(stats.earnings)}</p>
          <p className="text-[10px] text-muted-foreground">Earnings today</p>
        </Card>
        <Card className="p-3 text-center">
          <Bike className="h-4 w-4 mx-auto mb-1 text-amber-500" />
          <p className="text-xl font-bold">{stats.active}</p>
          <p className="text-[10px] text-muted-foreground">Active jobs</p>
        </Card>
      </div>

      {/* ====== ACTIVE ORDERS MINI LIST ====== */}
      {activeOrders.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Current Jobs</h2>
          {activeOrders.map((o) => {
            const a = o.address_snapshot ?? {};
            const m = merchants[o.merchant_id];
            return (
              <Card key={o.id} className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] font-mono">{o.code}</Badge>
                    <span className="text-[10px] uppercase text-muted-foreground">{o.status.replace(/_/g, " ")}</span>
                  </div>
                  <p className="text-xs truncate mt-0.5">{a.address_line1}{a.city ? `, ${a.city}` : ""}</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/merchant/rider/active-delivery`}>Open</Link>
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
