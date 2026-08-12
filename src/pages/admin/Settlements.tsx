import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { toast } from "sonner";

const fmt = (n: any) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n || 0));

export default function Settlements() {
  const [rows, setRows] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [merchantMap, setMerchantMap] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ merchant_id: "", period_start: "", period_end: "" });
  const [busy, setBusy] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const payViaChipSend = async (id: string) => {
    setPayingId(id);
    const { data, error } = await supabase.functions.invoke("chip-send-payout", { body: { settlement_id: id } });
    setPayingId(null);
    if (error) return toast.error(error.message);
    if (!data?.ok) { load(); return toast.error(data?.error ?? "Payout failed."); }
    toast.success(data.message);
    load();
  };


  const load = async () => {
    const { data } = await supabase.from("settlements").select("*").order("period_end", { ascending: false }).limit(200);
    setRows((data ?? []).filter((r: any) => filter === "all" || r.status === filter));
  };
  useEffect(() => {
    supabase.from("merchants").select("id,name").order("name").then(({ data }) => {
      setMerchants(data ?? []);
      const m: Record<string, string> = {}; (data ?? []).forEach((x: any) => { m[x.id] = x.name; });
      setMerchantMap(m);
    });
  }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const generate = async () => {
    if (!form.merchant_id || !form.period_start || !form.period_end) return toast.error("All fields required");
    setBusy(true);
    const { data: orders } = await supabase.from("orders").select("total_amount,delivery_fee,service_fee,processing_fee")
      .eq("merchant_id", form.merchant_id).eq("payment_status", "paid")
      .gte("created_at", form.period_start).lte("created_at", form.period_end + "T23:59:59");
    const sum = (key: string) => (orders ?? []).reduce((a, o: any) => a + Number(o[key] || 0), 0);
    const gross = sum("total_amount");
    const deliveryTotal = sum("delivery_fee");
    const serviceTotal = sum("service_fee");
    const processingTotal = sum("processing_fee");
    const m = merchants.find((x) => x.id === form.merchant_id);
    const { data: rate } = await supabase.from("commissions").select("value,type").eq("merchant_id", form.merchant_id).eq("active", true).maybeSingle();
    const { data: defaultRate } = await supabase.from("commissions").select("value,type").eq("is_default", true).eq("active", true).maybeSingle();
    const r = rate ?? defaultRate ?? { value: 10, type: "percent" };
    const commission = r.type === "percent" ? gross * Number(r.value) / 100 : Number(r.value);
    const net = gross - commission - deliveryTotal - serviceTotal - processingTotal;
    const { error } = await supabase.from("settlements").insert({
      merchant_id: form.merchant_id, period_start: form.period_start, period_end: form.period_end,
      gross_sales: gross, commission_amount: commission,
      delivery_fee_total: deliveryTotal, service_fee_total: serviceTotal, processing_fee_total: processingTotal,
      net_payout: net, status: "pending" as any,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Settlement generated for ${m?.name}: ${fmt(net)}`);
    setOpen(false); setForm({ merchant_id: "", period_start: "", period_end: "" }); load();
  };

  const setStatus = async (id: string, status: "processing" | "paid" | "failed", merchant_id?: string) => {
    const patch: any = { status };
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("settlements").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    if (status === "paid" && merchant_id) {
      const { data: m } = await supabase.from("merchants").select("owner_id").eq("id", merchant_id).maybeSingle();
      if (m?.owner_id) {
        await supabase.from("notifications").insert({
          user_id: m.owner_id, type: "system" as any,
          title: "Settlement paid", body: "Your settlement has been processed and paid out.",
          link: "/merchant/settlements",
        });
      }
    }
    toast.success("Status updated"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Settlements</h1><p className="text-sm text-muted-foreground">Merchant payouts.</p></div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>+ Generate</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Generate settlement</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Merchant</Label>
                  <Select value={form.merchant_id} onValueChange={(v) => setForm({ ...form, merchant_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose merchant" /></SelectTrigger>
                    <SelectContent>{merchants.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>From</Label><Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} /></div>
                  <div><Label>To</Label><Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} /></div>
                </div>
                <Button className="w-full" onClick={generate} disabled={busy}>{busy ? "Calculating…" : "Generate"}</Button>
                <p className="text-xs text-muted-foreground">Sums all paid orders in range, applies merchant's commission rate, then deducts delivery, service and processing fees.</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr className="text-left text-xs uppercase text-muted-foreground">
            <th className="p-3">Merchant</th><th className="p-3">Period</th><th className="p-3">Gross</th>
            <th className="p-3">Commission</th><th className="p-3">Delivery</th><th className="p-3">Service</th>
            <th className="p-3">Processing</th><th className="p-3">Net</th><th className="p-3">Status</th>
            <th className="p-3">Paid</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="p-3">{merchantMap[r.merchant_id] ?? "—"}</td>
                <td className="p-3 text-xs">{r.period_start} → {r.period_end}</td>
                <td className="p-3">{fmt(r.gross_sales)}</td>
                <td className="p-3">{fmt(r.commission_amount)}</td>
                <td className="p-3">{fmt(r.delivery_fee_total)}</td>
                <td className="p-3">{fmt(r.service_fee_total)}</td>
                <td className="p-3">{fmt(r.processing_fee_total)}</td>
                <td className="p-3 font-semibold">{fmt(r.net_payout)}</td>
                <td className="p-3"><StatusBadge value={r.status} /></td>
                <td className="p-3 text-xs">{r.paid_at ? new Date(r.paid_at).toLocaleDateString() : "—"}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    {r.status !== "paid" && !r.chip_send_instruction_id && (
                      <Button size="sm" onClick={() => payViaChipSend(r.id)} disabled={payingId === r.id}>
                        {payingId === r.id ? "Sending…" : "Pay via CHIP Send"}
                      </Button>
                    )}
                    {r.status === "pending" && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "processing")}>Process</Button>}
                    {r.status === "processing" && <>
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "paid", r.merchant_id)}>Mark paid</Button>
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "failed")}>Failed</Button>
                    </>}
                    {r.status === "failed" && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "processing")}>Retry</Button>}
                  </div>
                  {r.payout_error && <p className="mt-1 text-right text-xs text-destructive">{r.payout_error}</p>}
                </td>

              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={11} className="p-6 text-center text-muted-foreground">No settlements.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
