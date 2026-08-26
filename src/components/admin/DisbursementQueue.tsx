import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { toast } from "sonner";
import { RefreshCw, Send } from "lucide-react";

const fmt = (n: any) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n || 0));

type Kind = "merchant" | "rider";

type Row = {
  id: string;
  name: string;
  period: string;
  net: number;
  status: string;
  payout_state: string | null;
  payout_error: string | null;
  instruction_id: number | null;
  bank: any | null;
};

/** Pending settlements ready to be disbursed to merchant / rider bank accounts via CHIP Send. */
export function DisbursementQueue() {
  return (
    <Card className="p-4">
      <div className="mb-3">
        <p className="font-semibold">Barisan disbursement</p>
        <p className="text-xs text-muted-foreground">
          Settlement yang belum dibayar. Amaun diambil terus daripada net payout settlement.
        </p>
      </div>
      <Tabs defaultValue="merchant">
        <TabsList>
          <TabsTrigger value="merchant">Merchant</TabsTrigger>
          <TabsTrigger value="rider">Rider</TabsTrigger>
        </TabsList>
        <TabsContent value="merchant" className="mt-4"><QueueTable kind="merchant" /></TabsContent>
        <TabsContent value="rider" className="mt-4"><QueueTable kind="rider" /></TabsContent>
      </Tabs>
    </Card>
  );
}

function QueueTable({ kind }: { kind: Kind }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (kind === "merchant") {
      const [{ data: settlements }, { data: merchants }, { data: banks }] = await Promise.all([
        supabase.from("settlements").select("*").neq("status", "paid").order("period_end", { ascending: false }).limit(200),
        supabase.from("merchants").select("id,name"),
        supabase.from("payout_bank_accounts").select("*").eq("owner_type", "merchant"),
      ]);
      const nameMap: Record<string, string> = {};
      (merchants ?? []).forEach((m: any) => { nameMap[m.id] = m.name; });
      setRows((settlements ?? []).map((s: any) => ({
        id: s.id,
        name: nameMap[s.merchant_id] ?? "—",
        period: `${s.period_start} → ${s.period_end}`,
        net: Number(s.net_payout || 0),
        status: s.status,
        payout_state: s.payout_state,
        payout_error: s.payout_error,
        instruction_id: s.chip_send_instruction_id,
        bank: pickBank(banks ?? [], "merchant_id", s.merchant_id),
      })));
    } else {
      const [{ data: settlements }, { data: riders }, { data: banks }] = await Promise.all([
        supabase.from("rider_settlements").select("*").neq("status", "paid").order("period_end", { ascending: false }).limit(200),
        supabase.from("riders").select("id,full_name"),
        supabase.from("payout_bank_accounts").select("*").eq("owner_type", "rider"),
      ]);
      const nameMap: Record<string, string> = {};
      (riders ?? []).forEach((r: any) => { nameMap[r.id] = r.full_name; });
      setRows((settlements ?? []).map((s: any) => ({
        id: s.id,
        name: nameMap[s.rider_id] ?? "—",
        period: `${s.period_start} → ${s.period_end}`,
        net: Number(s.net_payout || 0),
        status: s.status,
        payout_state: s.payout_state,
        payout_error: s.payout_error,
        instruction_id: s.chip_send_instruction_id,
        bank: pickBank(banks ?? [], "rider_id", s.rider_id),
      })));
    }
    setLoading(false);
  }, [kind]);

  useEffect(() => { load(); }, [load]);

  const disburse = async (row: Row) => {
    setPayingId(row.id);
    const body = kind === "merchant" ? { settlement_id: row.id } : { rider_settlement_id: row.id };
    const { data, error } = await supabase.functions.invoke("chip-send-payout", { body });
    setPayingId(null);
    if (error) return toast.error(error.message);
    if (!data?.ok) { load(); return toast.error(data?.error ?? "Disbursement gagal."); }
    toast.success(data.message);
    load();
  };

  const total = rows.reduce((a, r) => a + r.net, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {rows.length} settlement belum dibayar · jumlah {fmt(total)}
        </p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />Muat semula
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">{kind === "merchant" ? "Merchant" : "Rider"}</th>
              <th className="p-3">Tempoh</th>
              <th className="p-3">Net payout</th>
              <th className="p-3">Akaun bank</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ready = !!r.bank?.chip_bank_account_id && ["verified", "pending"].includes(String(r.bank?.status ?? "pending"));
              return (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3 text-xs">{r.period}</td>
                  <td className="p-3 font-semibold">{fmt(r.net)}</td>
                  <td className="p-3 text-xs">
                    {r.bank ? (
                      <div className="space-y-1">
                        <p>{r.bank.bank_code} · {r.bank.account_number}</p>
                        <Badge variant={ready ? "secondary" : "destructive"} className="capitalize">
                          {r.bank.chip_bank_account_id ? (r.bank.status ?? "pending") : "belum daftar CHIP"}
                        </Badge>
                      </div>
                    ) : <span className="text-destructive">Tiada akaun bank</span>}
                  </td>
                  <td className="p-3">
                    <StatusBadge value={r.status} />
                    {r.payout_state && <p className="mt-1 text-xs capitalize text-muted-foreground">{r.payout_state}</p>}
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" onClick={() => disburse(r)} disabled={!ready || !!r.instruction_id || payingId === r.id}>
                      <Send className="mr-2 h-4 w-4" />
                      {payingId === r.id ? "Menghantar…" : r.instruction_id ? "Sudah dihantar" : "Disburse"}
                    </Button>
                    {r.payout_error && <p className="mt-1 text-xs text-destructive">{r.payout_error}</p>}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">
                {loading ? "Memuatkan…" : "Tiada settlement menunggu pembayaran."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function pickBank(banks: any[], key: "merchant_id" | "rider_id", id: string) {
  const list = banks.filter((b) => b[key] === id);
  if (list.length === 0) return null;
  return list.sort((a, b) => Number(!!b.is_default) - Number(!!a.is_default))[0];
}

export default DisbursementQueue;
