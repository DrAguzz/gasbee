import { useEffect, useState } from "react";
import { formatOrderItemName } from "@/lib/receipt";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMerchantContext } from "@/hooks/useMerchantContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const NEXT: Record<string, string> = {
  pending: "accepted", accepted: "preparing",
};

export default function MerchantOrderDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { merchant } = useMerchantContext();
  const [o, setO] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [riderId, setRiderId] = useState<string>("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    setO(data);
    setRiderId(data?.rider_id ?? "");
    const { data: oi } = await supabase.from("order_items").select("*").eq("order_id", id);
    setItems(oi ?? []);
  };
  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (!merchant) return;
    supabase.from("riders").select("id,full_name,phone,is_active").eq("merchant_id", merchant.id).eq("is_active", true).then(({ data }) => setRiders(data ?? []));
  }, [merchant?.id]);

  // Live updates on this order (e.g. rider accepts, status changes)
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, (p) => {
        const nu: any = p.new; const ol: any = p.old;
        setO((prev: any) => prev ? { ...prev, ...nu } : nu);
        if (nu.status === "rider_accepted" && ol.status !== "rider_accepted") {
          toast.success("Rider accepted the job");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const assignRider = async (rid: string) => {
    const { error } = await supabase.from("orders").update({
      rider_id: rid || null,
      assigned_at: rid ? new Date().toISOString() : null,
      status: rid && (o.status === "accepted" || o.status === "preparing") ? "assigned" : o.status,
    }).eq("id", o.id);
    if (error) { toast.error(error.message); return; }
    if (rid) {
      const r = riders.find((x) => x.id === rid);
      toast.success(`Assigned to ${r?.full_name}. Waiting for rider to accept…`);
    } else toast.success("Unassigned");
    load();
  };

  if (!o) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const fmt = (n: any) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n||0));

  const updateStatus = async (next: string) => {
    const stamp: any = {};
    if (next === "accepted") stamp.accepted_at = new Date().toISOString();
    if (next === "picked_up") stamp.picked_up_at = new Date().toISOString();
    if (next === "delivered") stamp.delivered_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update({ status: next as any, ...stamp }).eq("id", o.id);
    if (error) toast.error(error.message); else { toast.success("Updated"); load(); }
  };
  const reject = async () => {
    const reason = rejectReason.trim();
    if (reason.length < 3) { toast.error("Please enter a rejection reason"); return; }
    const { error } = await supabase.from("orders").update({ status: "cancelled", rejected_at: new Date().toISOString(), failure_reason: reason }).eq("id", o.id);
    if (error) toast.error(error.message); else { toast.success("Rejected"); setRejectOpen(false); setRejectReason(""); load(); }
  };


  const paid = o.payment_status === "paid";
  const isCod = o.payment_method === "cod";
  const acceptedStatuses = ["accepted","preparing","assigned","rider_accepted","arrived_at_merchant","picked_up","on_delivery","arrived_at_customer","delivered"];
  const orderAccepted = acceptedStatuses.includes(o.status);
  const canDecide = o.status === "pending" && (isCod || paid);
  const canAssignRider = orderAccepted && (isCod || paid);
  const paymentStatusLabel = isCod ? (o.status === "delivered" ? "Collected" : "To be collected") : o.payment_status;
  const orderStatusLabel = (isCod && o.status === "pending") ? "Pending Merchant Confirmation" : o.status;
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)}>← Back</Button>
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{o.code}</h1><p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p></div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2"><StatusBadge value={orderStatusLabel} /><StatusBadge value={paymentStatusLabel} /></div>
          <div className="text-xs text-muted-foreground">Payment method: <span className="font-semibold uppercase">{o.payment_method}</span></div>
        </div>
      </div>

      <Card className="p-4">
        <h2 className="mb-2 font-semibold">Delivery</h2>
        <p className="text-sm">{o.address_snapshot?.recipient_name}</p>
        <p className="text-sm text-muted-foreground">{o.address_snapshot?.recipient_phone}</p>
        <p className="text-sm text-muted-foreground">{o.address_snapshot?.address_line1}, {o.address_snapshot?.postcode} {o.address_snapshot?.city}</p>
        {o.notes && <p className="mt-2 text-xs italic">Notes: {o.notes}</p>}
      </Card>

      {!isCod && !paid && (
        <Card className="p-4 border-amber-500/40 bg-amber-500/10">
          <p className="text-sm font-medium">⏳ Waiting for payment confirmation. Merchant actions will be available once payment is confirmed.</p>
        </Card>
      )}
      {isCod && o.status === "pending" && (
        <Card className="p-4 border-amber-500/40 bg-amber-500/10">
          <p className="text-sm font-medium">📞 Please confirm this COD order with the customer before assigning a rider.</p>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-2 font-semibold">Assign Rider</h2>
        <div className="flex gap-2">
          <Select value={riderId || "none"} onValueChange={(v) => setRiderId(v === "none" ? "" : v)} disabled={!canAssignRider}>
            <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select rider" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Unassigned —</SelectItem>
              {riders.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name} · {r.phone}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => assignRider(riderId)} disabled={!canAssignRider}>{o.rider_id ? "Update" : "Assign"}</Button>
        </div>
        {riders.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No active riders. Add riders in the Riders page.</p>}
        {!canAssignRider && !orderAccepted && <p className="mt-2 text-xs text-muted-foreground">{isCod ? "Rider assignment unlocks after you mark the COD order as accepted." : "Rider assignment unlocks after payment is confirmed and order is accepted."}</p>}
        {o.rider_id && (() => {
          const ar = riders.find((x) => x.id === o.rider_id);
          const accepted = ["rider_accepted","arrived_at_merchant","picked_up","on_delivery","arrived_at_customer","delivered"].includes(o.status);
          return (
            <div className={`mt-3 rounded border p-3 text-sm ${accepted ? "border-primary bg-primary/5" : "border-amber-500/40 bg-amber-500/10"}`}>
              <div className="font-semibold">{ar ? `${ar.full_name} · ${ar.phone}` : "Rider"}</div>
              <div className="text-xs">{accepted ? "✓ Rider has accepted the job" : "⏳ Waiting for rider to accept…"}</div>
            </div>
          );
        })()}
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40"><tr className="text-left"><th className="p-3">Item</th><th className="p-3">Qty</th><th className="p-3">Price</th><th className="p-3">Subtotal</th></tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b"><td className="p-3">{formatOrderItemName(it)}</td><td className="p-3">{it.quantity}</td><td className="p-3">{fmt(it.unit_price)}</td><td className="p-3 font-semibold">{fmt(it.subtotal)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-1 border-t p-4 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{fmt(o.items_subtotal)}</span></div>
          <div className="flex justify-between"><span>Delivery</span><span>{fmt(o.delivery_fee)}</span></div>
          {Number(o.discount) > 0 && <div className="flex justify-between"><span>Discount</span><span>- {fmt(o.discount)}</span></div>}
          <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span>{fmt(o.total_amount)}</span></div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {o.status === "pending" && <Button variant="destructive" onClick={() => setRejectOpen(true)} disabled={!canDecide}>Reject</Button>}
        {NEXT[o.status] && <Button onClick={() => updateStatus(NEXT[o.status])} disabled={o.status === "pending" ? !canDecide : !(isCod || paid)}>Mark as {NEXT[o.status].replace(/_/g, " ")}</Button>}
      </div>

      {o.failure_reason && (o.status === "cancelled" || o.rejected_at) && (
        <Card className="p-4 border-destructive/40">
          <h2 className="mb-1 font-semibold text-destructive">Rejection reason</h2>
          <p className="text-sm">{o.failure_reason}</p>
        </Card>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject order</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Please provide a reason for rejecting this order. The customer will see this note.</p>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Out of stock, outside delivery area…" rows={4} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={reject}>Confirm reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
