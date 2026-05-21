import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  ShoppingBag, DollarSign, Store, Bike, Clock, CheckCircle2, XCircle, RotateCcw,
} from "lucide-react";

interface Stats {
  totalOrders: number; revenue: number; activeMerchants: number; activeRiders: number;
  pending: number; completed: number; cancelled: number; refunds: number;
}

const Stat = ({ label, value, icon: Icon, hint, to }: { label: string; value: string|number; icon: any; hint?: string; to: string }) => (
  <Link to={to} className="block">
    <Card className="p-5 transition hover:bg-accent/40 hover:shadow-md cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-bold">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></div>
      </div>
    </Card>
  </Link>
);

export default function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);
  const [topMerchants, setTopMerchants] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [ordRes, paidRes, merRes, ridRes, pendRes, compRes, canRes, refRes, topRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total_amount").eq("payment_status", "paid"),
        supabase.from("merchants").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("riders").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
        supabase.from("refunds").select("id", { count: "exact", head: true }).eq("status", "requested"),
        supabase.from("merchants").select("id,name,total_orders,rating").order("total_orders", { ascending: false }).limit(5),
      ]);
      const revenue = (paidRes.data ?? []).reduce((a, r: any) => a + Number(r.total_amount || 0), 0);
      setS({
        totalOrders: ordRes.count ?? 0, revenue,
        activeMerchants: merRes.count ?? 0, activeRiders: ridRes.count ?? 0,
        pending: pendRes.count ?? 0, completed: compRes.count ?? 0,
        cancelled: canRes.count ?? 0, refunds: refRes.count ?? 0,
      });
      setTopMerchants(topRes.data ?? []);
    })();
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(n);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live overview of Gasbee operations.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total Orders" value={s?.totalOrders ?? "—"} icon={ShoppingBag} to="/orders" />
        <Stat label="Revenue" value={s ? fmt(s.revenue) : "—"} icon={DollarSign} to="/payments" />
        <Stat label="Active Merchants" value={s?.activeMerchants ?? "—"} icon={Store} to="/merchants" />
        <Stat label="Active Riders" value={s?.activeRiders ?? "—"} icon={Bike} to="/riders" />
        <Stat label="Pending Orders" value={s?.pending ?? "—"} icon={Clock} to="/orders?status=pending" />
        <Stat label="Completed" value={s?.completed ?? "—"} icon={CheckCircle2} to="/orders?status=delivered" />
        <Stat label="Cancelled" value={s?.cancelled ?? "—"} icon={XCircle} to="/orders?status=cancelled" />
        <Stat label="Refund Requests" value={s?.refunds ?? "—"} icon={RotateCcw} to="/refunds" />
      </div>
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Top Merchants</h2>
        {topMerchants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No merchants yet.</p>
        ) : (
          <div className="space-y-2">
            {topMerchants.map((m) => (
              <Link key={m.id} to={`/merchants/${m.id}`} className="flex items-center justify-between rounded-md border p-3 transition hover:bg-accent/40">
                <div className="font-medium">{m.name}</div>
                <div className="text-sm text-muted-foreground">{m.total_orders} orders · ★ {Number(m.rating ?? 0).toFixed(1)}</div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
