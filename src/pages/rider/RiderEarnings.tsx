import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

export default function RiderEarnings() {
  const { user } = useAuth();
  const [data, setData] = useState({ today: 0, week: 0, month: 0, total: 0, count: 0 });
  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: r } = await supabase.from("riders").select("id").eq("user_id", user.id).maybeSingle();
      if (!r) return;
      const { data: orders } = await supabase.from("orders").select("delivery_fee,delivered_at").eq("rider_id", r.id).eq("status", "delivered");
      const now = new Date();
      const startToday = new Date(now); startToday.setHours(0,0,0,0);
      const startWeek = new Date(now); startWeek.setDate(now.getDate() - 7);
      const startMonth = new Date(now); startMonth.setMonth(now.getMonth() - 1);
      let today = 0, week = 0, month = 0, total = 0;
      (orders ?? []).forEach((o: any) => {
        const fee = Number(o.delivery_fee || 0);
        const d = new Date(o.delivered_at);
        total += fee;
        if (d >= startMonth) month += fee;
        if (d >= startWeek) week += fee;
        if (d >= startToday) today += fee;
      });
      setData({ today, week, month, total, count: orders?.length ?? 0 });
    })();
  }, [user?.id]);
  const fmt = (n: number) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(n);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Earnings</h1>
      <Card className="p-4"><p className="text-sm text-muted-foreground">Today</p><p className="text-3xl font-bold">{fmt(data.today)}</p></Card>
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">7 days</p><p className="text-xl font-bold">{fmt(data.week)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">30 days</p><p className="text-xl font-bold">{fmt(data.month)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">All-time</p><p className="text-xl font-bold">{fmt(data.total)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total deliveries</p><p className="text-xl font-bold">{data.count}</p></Card>
      </div>
      <Link to="/merchant/rider/settlements">
        <Card className="p-4 hover:bg-muted/40">
          <p className="text-sm font-semibold">Settlements &amp; payouts</p>
          <p className="text-xs text-muted-foreground">View your payout records and bank account.</p>
        </Card>
      </Link>
    </div>
  );
}
