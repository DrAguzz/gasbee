import { useEffect, useState } from "react";
import { formatOrderItemName } from "@/lib/receipt";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { toast } from "sonner";

export default function OrderDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [riderId, setRiderId] = useState<string>("");

  const load = async () => {
    const { data } = await supabase.from("orders").select("*").eq("id", id!).maybeSingle();
    setOrder(data);
    setRiderId(data?.rider_id ?? "");
    const { data: it } = await supabase.from("order_items").select("*").eq("order_id", id!);
    setItems(it ?? []);
    if (data?.merchant_id) {
      const { data: r } = await supabase.from("riders").select("id,full_name,status").eq("merchant_id", data.merchant_id);
      setRiders(r ?? []);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const updateStatus = async (status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Order updated"); load();
  };
  const assignRider = async () => {
    if (!riderId) return;
    const { error } = await supabase.from("orders").update({ rider_id: riderId, assigned_at: new Date().toISOString(), status: "assigned" as any }).eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Rider assigned"); load();
  };

  if (!order) return <div>Loading…</div>;
  const fmt = (n: any) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n||0));
  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={()=>nav(-1)}>← Back</Button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order {order.code}</h1>
          <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={order.status} />
          <StatusBadge value={order.payment_status} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Items</h2>
          {items.map((it) => (
            <div key={it.id} className="flex justify-between border-b py-2 last:border-0 text-sm">
              <span>{formatOrderItemName(it)} × {it.quantity}</span><span>{fmt(it.subtotal)}</span>
            </div>
          ))}
          <div className="mt-3 flex justify-between font-semibold"><span>Total</span><span>{fmt(order.total_amount)}</span></div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground italic">
            <span>Payment method</span>
            <span>{order.payment_method === "fpx" ? "FPX (Online Transfer)" : (order.payment_method === "card" ? "Credit Card" : (order.payment_method === "cod" ? "COD (Cash on Delivery)" : (order.payment_method ?? "—").toUpperCase()))}</span>
          </div>
        </Card>
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Delivery</h2>
          {(() => {
            const a = order.address_snapshot ?? {};
            return (
              <div className="space-y-1 text-sm">
                {a.label && <div className="font-medium">{a.label}</div>}
                {a.recipient_name && <div>{a.recipient_name} {a.recipient_phone && <span className="text-muted-foreground">· {a.recipient_phone}</span>}</div>}
                <div className="text-muted-foreground">
                  {a.address_line1}{a.address_line2 ? `, ${a.address_line2}` : ""}
                </div>
                <div className="text-muted-foreground">
                  {[a.postcode, a.city, a.state].filter(Boolean).join(" ")}
                </div>
                {a.latitude && a.longitude && (
                  <a className="text-xs text-primary underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}>
                    📍 Open in Google Maps
                  </a>
                )}
              </div>
            );
          })()}
          <div className="space-y-2 border-t pt-3">
            <label className="text-sm font-medium">Assign rider</label>
            <div className="flex gap-2">
              <Select value={riderId} onValueChange={setRiderId}>
                <SelectTrigger><SelectValue placeholder="Select rider" /></SelectTrigger>
                <SelectContent>
                  {riders.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name} ({r.status})</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={assignRider}>Assign</Button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Update status</h2>
        <div className="flex flex-wrap gap-2">
          {["accepted","rejected","preparing","picked_up","on_delivery","delivered","failed","cancelled","refunded"].map((s) => (
            <Button key={s} variant="outline" size="sm" onClick={()=>updateStatus(s)}>{s}</Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
