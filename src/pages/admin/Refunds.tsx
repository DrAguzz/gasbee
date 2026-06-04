import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DataListPage } from "@/components/admin/DataListPage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { SignedLink } from "@/components/SignedImage";

const fmt = (n: any) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n || 0));

function RefundDetails({ row }: { row: any }) {
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<any>(null);
  useEffect(() => {
    if (!open || !row.order_id) return;
    supabase.from("orders").select("code,total_amount,merchant_id,customer_id,status,payment_status").eq("id", row.order_id).maybeSingle().then(({ data }) => setOrder(data));
  }, [open, row.order_id]);
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Details</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Refund details</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Order:</span> <span className="font-mono">{order?.code ?? row.order_id}</span></div>
            <div><span className="text-muted-foreground">Stage:</span> <span className="capitalize">{(row.stage ?? "—").replace(/_/g, " ")}</span></div>
            <div><span className="text-muted-foreground">Reason:</span> {row.reason_category ?? "—"} {row.reason && <span className="text-xs text-muted-foreground">— {row.reason}</span>}</div>
            <div className="rounded bg-muted p-2 text-xs space-y-1">
              <div className="flex justify-between"><span>Refund amount</span><strong>{fmt(row.refund_amount ?? row.amount)}</strong></div>
              {Number(row.delivery_fee_charged) > 0 && <div className="flex justify-between"><span>− Delivery charged</span><span>{fmt(row.delivery_fee_charged)}</span></div>}
              {Number(row.restocking_fee) > 0 && <div className="flex justify-between"><span>− Restocking</span><span>{fmt(row.restocking_fee)}</span></div>}
            </div>
            {row.notes && <div><span className="text-muted-foreground">Notes:</span> {row.notes}</div>}
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge value={row.status} /></div>
            <div><span className="text-muted-foreground">Pickup:</span> <StatusBadge value={row.pickup_status} /></div>
            {row.pickup_proof_url && <div><SignedLink url={row.pickup_proof_url} bucket="delivery-proofs" className="text-primary underline" target="_blank" rel="noreferrer">View pickup proof</SignedLink></div>}
            <div><span className="text-muted-foreground">Requested:</span> {new Date(row.created_at).toLocaleString()}</div>
            {row.merchant_acknowledged_at && (
              <div className="rounded bg-muted p-2 text-xs">✓ Merchant acknowledged on {new Date(row.merchant_acknowledged_at).toLocaleString()}</div>
            )}
            {row.status === "approved" && !row.merchant_acknowledged_at && (
              <div className="rounded bg-yellow-500/10 p-2 text-xs">⏳ Awaiting merchant acknowledgement</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Refunds() {
  const decide = async (row: any, status: "approved" | "rejected" | "processed") => {
    const updates: any = { status };
    const { error } = await supabase.from("refunds").update(updates).eq("id", row.id);
    if (error) return toast.error(error.message);

    const { data: order } = await supabase.from("orders").select("merchant_id,code,customer_id").eq("id", row.order_id).maybeSingle();

    if (status === "approved") {
      // Notify merchant
      if (order?.merchant_id) {
        const { data: ms } = await supabase.from("merchants").select("owner_id").eq("id", order.merchant_id).maybeSingle();
        if (ms?.owner_id) {
          await supabase.from("notifications").insert({
            user_id: ms.owner_id, type: "system" as any,
            title: "Refund approved — please acknowledge",
            body: `Order ${order.code}: refund of ${fmt(row.refund_amount ?? row.amount)} approved.`,
            link: "/merchant/refunds",
          });
        }
      }
      // Notify rider if pickup required
      if (row.pickup_rider_id) {
        const { data: r } = await supabase.from("riders").select("user_id").eq("id", row.pickup_rider_id).maybeSingle();
        if (r?.user_id) {
          await supabase.from("notifications").insert({
            user_id: r.user_id, type: "order" as any,
            title: "Refund pickup assigned",
            body: `Order ${order?.code}: collect cylinder back from customer.`,
            link: "/merchant/rider/refund-pickups",
          });
        }
      }
    }

    if (status === "processed") {
      // Notify customer
      if (order?.customer_id) {
        await supabase.from("notifications").insert({
          user_id: order.customer_id, type: "system" as any,
          title: "Refund anda diproses",
          body: `Order ${order.code}: refund ${fmt(row.refund_amount ?? row.amount)} telah diproses.`,
          link: `/user/orders/${row.order_id}`,
        });
      }
    }

    toast.success("Updated"); setTimeout(() => location.reload(), 200);
  };

  const canProcess = (r: any) => {
    if (r.status !== "approved") return false;
    if (!r.merchant_acknowledged_at) return false;
    if (r.pickup_status === "pending") return false; // wait for rider pickup
    return true;
  };

  return (
    <DataListPage
      title="Refunds" description="Customer refund requests."
      table="refunds" orderBy={{ column: "created_at", ascending: false }}
      columns={[
        { key: "stage", label: "Stage", render: (r: any) => <span className="capitalize text-xs">{(r.stage ?? "—").replace(/_/g, " ")}</span> },
        { key: "amount", label: "Refund", render: (r: any) => fmt(r.refund_amount ?? r.amount) },
        { key: "reason_category", label: "Reason" },
        { key: "status", label: "Status", render: (r: any) => <StatusBadge value={r.status} /> },
        { key: "pickup_status", label: "Pickup", render: (r: any) => r.pickup_status === "not_required" ? "—" : <StatusBadge value={r.pickup_status} /> },
        { key: "ack", label: "M.Ack", render: (r: any) => r.merchant_acknowledged_at ? "✓" : (r.status === "approved" ? "⏳" : "—") },
        { key: "created_at", label: "Date", render: (r: any) => new Date(r.created_at).toLocaleDateString() },
      ]}
      rowAction={(r: any) => (
        <div className="flex justify-end gap-2">
          <RefundDetails row={r} />
          {r.status === "requested" && <>
            <Button size="sm" onClick={() => decide(r, "approved")}>Approve</Button>
            <Button size="sm" variant="outline" onClick={() => decide(r, "rejected")}>Reject</Button>
          </>}
          {canProcess(r) && (
            <Button size="sm" onClick={() => decide(r, "processed")}>Mark processed</Button>
          )}
        </div>
      )}
    />
  );
}
