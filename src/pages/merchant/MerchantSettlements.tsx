import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchantContext } from "@/hooks/useMerchantContext";
import { Card } from "@/components/ui/card";
import PayoutBankAccountCard from "@/components/payouts/PayoutBankAccountCard";


export default function MerchantSettlements() {
  const { merchant } = useMerchantContext();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!merchant) return;
    supabase.from("settlements").select("*").eq("merchant_id", merchant.id).order("period_end", { ascending: false }).then(({ data }) => setItems(data ?? []));
  }, [merchant?.id]);

  const fmt = (n: any) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n||0));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settlements</h1>
      <Card className="p-4 text-sm">
        <p className="font-semibold">How settlements work</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted-foreground">
          <li>Gasbee admin generates a settlement for a date range from your paid orders.</li>
          <li>Gross sales − commission = your net payout.</li>
          <li>Once admin marks it Paid, the funds are transferred to your registered bank account.</li>
        </ol>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40"><tr className="text-left"><th className="p-3">Period</th><th className="p-3">Gross</th><th className="p-3">Commission</th><th className="p-3">Net payout</th><th className="p-3">Status</th><th className="p-3">Paid</th></tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-b"><td className="p-3">{s.period_start} → {s.period_end}</td><td className="p-3">{fmt(s.gross_sales)}</td><td className="p-3">{fmt(s.commission_amount)}</td><td className="p-3 font-bold">{fmt(s.net_payout)}</td><td className="p-3 capitalize">{s.status}</td><td className="p-3 text-xs">{s.paid_at ? new Date(s.paid_at).toLocaleDateString() : "—"}</td></tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">No settlements yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
