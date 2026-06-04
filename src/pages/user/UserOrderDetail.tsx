import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { toast } from "sonner";
import { Phone, Navigation, Clock, CheckCircle2, Package, Truck, Home, Download } from "lucide-react";
import { downloadReceipt } from "@/lib/receipt";
import { MapPicker } from "@/components/MapPicker";
import { OrderChat } from "@/components/OrderChat";
import { OrderRating } from "@/components/user/OrderRating";

const STEPS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "preparing", label: "Preparing", icon: Package },
  { key: "out_for_delivery", label: "On the way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

export default function UserOrderDetail() {
  const { id } = useParams();
  const [o, setO] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [riderLoc, setRiderLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: order } = await supabase.from("orders").select("*, merchants(name, phone, latitude, longitude), riders(id, full_name, phone, current_lat, current_lng, vehicle_type, vehicle_plate)").eq("id", id).maybeSingle();
      setO(order);
      if ((order as any)?.riders?.current_lat) {
        setRiderLoc({ lat: Number((order as any).riders.current_lat), lng: Number((order as any).riders.current_lng) });
      }
      const { data: oi } = await supabase.from("order_items").select("*").eq("order_id", id);
      setItems(oi ?? []);
    };
    load();
    const ch = supabase.channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // Subscribe to rider location updates
  useEffect(() => {
    const riderId = (o as any)?.riders?.id;
    if (!riderId) return;
    const ch = supabase.channel(`rider-${riderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "riders", filter: `id=eq.${riderId}` }, (p: any) => {
        if (p.new?.current_lat) setRiderLoc({ lat: Number(p.new.current_lat), lng: Number(p.new.current_lng) });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [(o as any)?.riders?.id]);

  if (!o) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const stepIdx = STEPS.findIndex((s) => s.key === o.status);
  const cancel = async () => {
    const { error } = await supabase.from("orders").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", o.id);
    if (error) toast.error(error.message); else { toast.success("Cancelled"); setO({ ...o, status: "cancelled" }); }
  };

  const a = o.address_snapshot ?? {};
  const markers: any[] = [];
  if (a.latitude) markers.push({ lat: Number(a.latitude), lng: Number(a.longitude), label: "Delivery address" });
  if (o.merchants?.latitude) markers.push({ lat: Number(o.merchants.latitude), lng: Number(o.merchants.longitude), label: o.merchants.name });
  if (riderLoc) markers.push({ lat: riderLoc.lat, lng: riderLoc.lng, label: "Rider 🛵" });

  const trackable = ["rider_accepted","arrived_at_merchant","picked_up","on_delivery","arrived_at_customer","out_for_delivery"].includes(o.status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{o.code}</h1>
        <StatusBadge value={o.status} />
      </div>

      {o.delivery_type === "scheduled" && o.scheduled_at && (
        <Card className="border-primary bg-primary/5 p-3 text-sm">
          📅 Scheduled delivery: <span className="font-semibold">{new Date(o.scheduled_at).toLocaleString()}</span>
        </Card>
      )}

      {stepIdx >= 0 && o.status !== "cancelled" && (
        <div className="glass-category-card animate-fade-in rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold">Order Tracking</div>
            <div className="text-[11px] font-medium text-primary">
              {Math.round(((stepIdx + 1) / STEPS.length) * 100)}% complete
            </div>
          </div>
          <div className="relative">
            {/* Progress line background */}
            <div className="absolute left-5 right-5 top-5 h-1 -translate-y-1/2 rounded-full bg-muted" />
            {/* Progress line filled */}
            <div
              className="absolute left-5 top-5 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700 ease-out"
              style={{ width: `calc((100% - 2.5rem) * ${stepIdx / (STEPS.length - 1)})` }}
            />
            <div className="relative flex items-start justify-between">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === stepIdx;
                const isDone = i <= stepIdx;
                return (
                  <div key={s.key} className="flex flex-1 flex-col items-center text-center">
                    <div
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-500 ${
                        isDone
                          ? "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30"
                          : "bg-muted text-muted-foreground"
                      } ${isActive ? "scale-110 ring-4 ring-primary/20" : ""}`}
                    >
                      {isActive && (
                        <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
                      )}
                      <Icon className="relative h-4 w-4" />
                    </div>
                    <div
                      className={`mt-2 text-[10px] font-medium leading-tight transition-colors ${
                        isDone ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {trackable && markers.length > 0 && (
        <Card className="p-2">
          <div className="mb-1 px-2 pt-1 text-sm font-semibold">Live tracking</div>
          <MapPicker lat={riderLoc?.lat ?? (a.latitude ? Number(a.latitude) : null)} lng={riderLoc?.lng ?? (a.longitude ? Number(a.longitude) : null)} readOnly markers={markers} height={260} />
          {!riderLoc && o.riders && <p className="px-2 pb-1 pt-1 text-[11px] text-muted-foreground">Waiting for rider GPS…</p>}
        </Card>
      )}

      <Card className="space-y-1 p-3 text-sm">
        <div className="font-semibold">Merchant</div>
        <div>{o.merchants?.name}</div>
        {o.merchants?.phone && <div className="text-xs text-muted-foreground">{o.merchants.phone}</div>}
      </Card>

      {o.riders && (
        <Card className="space-y-2 p-3 text-sm">
          <div className="font-semibold">Rider</div>
          <div>{o.riders.full_name} {o.riders.vehicle_type && <span className="text-xs text-muted-foreground">· {o.riders.vehicle_type} {o.riders.vehicle_plate ?? ""}</span>}</div>
          <div className="text-xs text-muted-foreground">{o.riders.phone}</div>
          {o.riders.phone && (
            <Button asChild size="sm" className="w-full"><a href={`tel:${o.riders.phone}`}><Phone className="mr-1 h-3 w-3" />Call rider</a></Button>
          )}
        </Card>
      )}

      <Card className="p-3">
        <div className="mb-1 flex items-center justify-between text-sm font-semibold"><span>Delivery to</span>
          {a.latitude && (
            <a className="text-xs text-primary underline" href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`} target="_blank" rel="noreferrer"><Navigation className="mr-1 inline h-3 w-3" />Open map</a>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {a.address_line1}, {a.postcode} {a.city}
        </div>
      </Card>

      {o.rider_id && <OrderChat orderId={o.id} senderRole="customer" />}

      <Card className="divide-y">
        {items.map((it) => (
          <div key={it.id} className="flex justify-between p-3 text-sm">
            <span>{it.product_name} × {it.quantity}</span>
            <span>RM {Number(it.subtotal).toFixed(2)}</span>
          </div>
        ))}
      </Card>

      <Card className="space-y-1 p-3 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>RM {Number(o.items_subtotal).toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Delivery</span><span>RM {Number(o.delivery_fee).toFixed(2)}</span></div>
        {Number(o.discount) > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span>- RM {Number(o.discount).toFixed(2)}</span></div>}
        <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span className="text-primary">RM {Number(o.total_amount).toFixed(2)}</span></div>
        <div className="flex justify-between pt-1 text-xs"><span>Payment</span><span className="uppercase">{o.payment_method === "fpx" ? "FPX (Online Transfer)" : (o.payment_method === "card" ? "Credit Card" : (o.payment_method === "cod" ? "COD (Cash on Delivery)" : (o.payment_method ?? "—")))} · {o.payment_status}</span></div>
      </Card>

      {o.payment_status !== "paid" && o.payment_method && o.payment_method !== "cod" && o.status !== "cancelled" && (
        <Card className={`space-y-2 p-3 ${o.payment_status === "failed" ? "border-destructive bg-destructive/5" : "border-amber-500 bg-amber-500/5"}`}>
          <div className="text-sm font-semibold">
            {o.payment_status === "failed" ? "❌ Payment failed" : "⏳ Payment pending"}
          </div>
          <p className="text-xs text-muted-foreground">
            {o.payment_status === "failed"
              ? "Your previous payment attempt was unsuccessful. The order is on hold and will not be processed by the merchant until payment is completed."
              : "Complete the payment to confirm your order. The merchant will only start processing once payment is received."}
          </p>
          <Link to={`/user/payment/${o.id}`}>
            <Button className="w-full">
              {o.payment_status === "failed" ? "Retry payment" : "Pay now"} (RM {Number(o.total_amount).toFixed(2)})
            </Button>
          </Link>
        </Card>
      )}

      {o.status === "delivered" && <OrderRating orderId={o.id} hasRider={!!o.rider_id} />}

      {o.status === "cancelled" && o.rejected_at && o.failure_reason && (
        <Card className="space-y-3 border-destructive/40 bg-destructive/5 p-4">
          <div>
            <div className="text-sm font-semibold text-destructive">Order rejected by merchant</div>
            <p className="mt-1 text-sm">{o.failure_reason}</p>
          </div>
          {o.payment_status === "paid" && (
            <RejectedOptions order={o} />
          )}
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {["pending","confirmed"].includes(o.status) && <Button variant="destructive" className="flex-1" onClick={cancel}>Cancel</Button>}
        {o.payment_status === "paid" && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => downloadReceipt(o.id).catch((e) => toast.error(e.message))}
          >
            <Download className="mr-1 h-4 w-4" />Download receipt
          </Button>
        )}
        {o.payment_status === "paid" && o.status !== "cancelled" && (
          <Button asChild variant="outline" className="flex-1"><Link to={`/user/refund?order=${o.id}`}>Request refund</Link></Button>
        )}
      </div>
    </div>
  );
}

function RejectedOptions({ order }: { order: any }) {
  const [credit, setCredit] = useState<any>(null);
  useEffect(() => {
    supabase.from("order_credits").select("*").eq("source_order_id", order.id).maybeSingle().then(({ data }) => setCredit(data));
  }, [order.id]);

  if (!credit) return <p className="text-xs text-muted-foreground">Preparing your store credit…</p>;
  if (credit.status === "used") {
    return <p className="text-xs text-muted-foreground">Credit of RM {Number(credit.amount).toFixed(2)} has been applied to another order.</p>;
  }
  if (credit.status === "refunded") {
    return <p className="text-xs text-muted-foreground">Full refund of RM {Number(credit.amount).toFixed(2)} is being processed.</p>;
  }
  const requestRefund = async () => {
    const { error: e1 } = await supabase.from("refunds").insert({
      order_id: order.id,
      requester_id: order.customer_id,
      reason: "Merchant rejected order — full refund requested",
      reason_category: "merchant_rejected",
      amount: order.total_amount,
      refund_amount: order.total_amount,
      status: "requested",
    });
    if (e1) { toast.error(e1.message); return; }
    const { error: e2 } = await supabase.from("order_credits").update({ status: "refunded", notes: "User chose full refund" }).eq("id", credit.id);
    if (e2) { toast.error(e2.message); return; }
    toast.success("Refund requested. Admin will process shortly.");
    setCredit({ ...credit, status: "refunded" });
  };
  return (
    <div className="space-y-2">
      <div className="rounded-md bg-background/60 p-3 text-sm">
        <div className="font-semibold">Store credit available: RM {Number(credit.amount).toFixed(2)}</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Place a new order with another merchant — your credit auto-applies at checkout. If the new total is higher, you only pay the difference. If lower, admin will refund the remainder.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild className="flex-1"><Link to="/user/merchants">Order from another merchant</Link></Button>
        <Button variant="outline" className="flex-1" onClick={requestRefund}>Request full refund</Button>
      </div>
    </div>
  );
}
