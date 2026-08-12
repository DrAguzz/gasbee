import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PayoutBankAccountCard } from "@/components/payouts/PayoutBankAccountCard";

const fmt = (n: any) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n || 0));

export default function RiderSettlements() {
  const { user } = useAuth();
  const [riderId, setRiderId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: r } = await supabase.from("riders").select("id").eq("user_id", user.id).maybeSingle();
      if (!r) return;
      setRiderId(r.id);
      const { data } = await supabase.from("rider_settlements").select("*")
        .eq("rider_id", r.id).order("period_end", { ascending: false }).limit(100);
      setRows(data ?? []);
    })();
  }, [user?.id]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Settlements</h1>
      {riderId && <PayoutBankAccountCard owner={{ owner_type: "rider", rider_id: riderId }} />}
      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="space-y-2 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{r.period_start} → {r.period_end}</p>
              <StatusBadge value={r.status} />
            </div>
            <p className="text-2xl font-bold">{fmt(r.net_payout)}</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <span>Deliveries: {r.deliveries_count}</span>
              <span>Fees: {fmt(r.delivery_fee_total)}</span>
              <span>Platform cut: {fmt(r.commission_amount)}</span>
            </div>
            {r.paid_at && <p className="text-xs text-muted-foreground">Paid on {new Date(r.paid_at).toLocaleDateString()}</p>}
          </Card>
        ))}
        {rows.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No settlements yet.</Card>}
      </div>
    </div>
  );
}
