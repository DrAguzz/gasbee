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

export function RiderSettlementsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [riderMap, setRiderMap] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ rider_id: "", period_start: "", period_end: "" });
  const [busy, setBusy] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("rider_settlements").select("*").order("period_end", { ascending: false }).limit(200);
    setRows((data ?? []).filter((r: any) => filter === "all" || r.status === filter));
  };

  useEffect(() => {
    supabase.from("riders").select("id,full_name").order("full_name").then(({ data }) => {
      setRiders(data ?? []);
      const m: Record<string, string> = {};
      (data ?? []).forEach((x: any) => { m[x.id] = x.full_name; });
      setRiderMap(m);
    });
  }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const generate = async () => {
    if (!form.rider_id || !form.period_start || !form.period_end) return toast.error("All fields required");
    setBusy(true);
    const { data: orders } = await supabase.from("orders").select("delivery_fee")
      .eq("rider_id", form.rider_id).eq("status", "delivered")
      .gte("delivered_at", form.period_start).lte("delivered_at", form.period_end + "T23:59:59");
    const deliveries = (orders ?? []).length;
    const deliveryTotal = (orders ?? []).reduce((a, o: any) => a + Number(o.delivery_fee || 0), 0);

    const { data: settings } = await supabase.from("app_settings").select("key,value")
      .in("key", ["rider_commission_type", "rider_commission_value"]);
    const read = (k: string) => {
      const v: any = (settings ?? []).find((s: any) => s.key === k)?.value;
      return typeof v === "object" && v !== null ? v.value : v;
    };
    const cType = String(read("rider_commission_type") ?? "percent");
    const cValue = Number(read("rider_commission_value") ?? 0);
    const commission = cType === "percent" ? deliveryTotal * cValue / 100 : cValue;
    const net = Math.max(0, deliveryTotal - commission);

    const { error } = await supabase.from("rider_settlements").insert({
      rider_id: form.rider_id, period_start: form.period_start, period_end: form.period_end,
      deliveries_count: deliveries, delivery_fee_total: deliveryTotal,
      commission_amount: commission, net_payout: net, status: "pending" as any,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Settlement generated for ${riderMap[form.rider_id]}: ${fmt(net)}`);
    setOpen(false); setForm({ rider_id: "", period_start: "", period_end: "" }); load();
  };

  const payViaChipSend = async (id: string) => {
    setPayingId(id);
    const { data, error } = await supabase.functions.invoke("chip-send-payout", { body: { rider_settlement_id: id } });
    setPayingId(null);
    if (error) return toast.error(error.message);
    if (!data?.ok) { load(); return toast.error(data?.error ?? "Payout failed."); }
    toast.success(data.message);
    load();
  };

  const setStatus = async (id: string, status: "processing" | "paid" | "failed") => {
    const patch: any = { status };
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("rider_settlements").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Rider payouts based on delivery fees of completed deliveries.</p>
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
              <DialogHeader><DialogTitle>Generate rider settlement</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Rider</Label>
                  <Select value={form.rider_id} onValueChange={(v) => setForm({ ...form, rider_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose rider" /></SelectTrigger>
                    <SelectContent>{riders.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>From</Label><Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} /></div>
                  <div><Label>To</Label><Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} /></div>
                </div>
                <Button className="w-full" onClick={generate} disabled={busy}>{busy ? "Calculating…" : "Generate"}</Button>
                <p className="text-xs text-muted-foreground">Sums delivery fees of all delivered orders in range, then deducts the platform cut configured in Settings.</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr className="text-left text-xs uppercase text-muted-foreground">
            <th className="p-3">Rider</th><th className="p-3">Period</th><th className="p-3">Deliveries</th>
            <th className="p-3">Delivery fees</th><th className="p-3">Platform cut</th><th className="p-3">Net</th>
            <th className="p-3">Status</th><th className="p-3">Paid</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="p-3">{riderMap[r.rider_id] ?? "—"}</td>
                <td className="p-3 text-xs">{r.period_start} → {r.period_end}</td>
                <td className="p-3">{r.deliveries_count}</td>
                <td className="p-3">{fmt(r.delivery_fee_total)}</td>
                <td className="p-3">{fmt(r.commission_amount)}</td>
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
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "paid")}>Mark paid</Button>
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "failed")}>Failed</Button>
                    </>}
                    {r.status === "failed" && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "processing")}>Retry</Button>}
                  </div>
                  {r.payout_error && <p className="mt-1 text-right text-xs text-destructive">{r.payout_error}</p>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No rider settlements.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
