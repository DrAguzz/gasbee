import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { calcDeliveryFee, haversineKm, DEFAULT_FEE_CONFIG, type FeeConfig } from "@/lib/delivery";

export default function UserCheckout() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const nav = useNavigate();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addrId, setAddrId] = useState<string>("");
  const [merchant, setMerchant] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "fpx" | "card" | "ewallet">("cod");
  const [deliveryType, setDeliveryType] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feeConfig, setFeeConfig] = useState<FeeConfig>(DEFAULT_FEE_CONFIG);
  const [credits, setCredits] = useState<any[]>([]);
  const [useCredit, setUseCredit] = useState(true);

  useEffect(() => {
    supabase.rpc("get_public_fee_settings").then(({ data }) => {
      const m: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        const raw = typeof r.value === "string" ? r.value : (r.value?.value ?? r.value);
        const n = Number(raw);
        if (Number.isFinite(n)) m[r.key] = n;
      });
      setFeeConfig({
        serviceFee: m.service_fee ?? DEFAULT_FEE_CONFIG.serviceFee,
        deliveryBaseFee: m.delivery_base_fee ?? DEFAULT_FEE_CONFIG.deliveryBaseFee,
        deliveryBaseKm: m.delivery_base_km ?? DEFAULT_FEE_CONFIG.deliveryBaseKm,
        deliveryPerKm: m.delivery_per_km ?? DEFAULT_FEE_CONFIG.deliveryPerKm,
        processingFee: m.processing_fee ?? DEFAULT_FEE_CONFIG.processingFee,
      });
    });

  }, []);

  const addr = addresses.find((a) => a.id === addrId);
  const distanceKm = haversineKm(addr?.latitude, addr?.longitude, merchant?.latitude, merchant?.longitude);
  const feeCalc = calcDeliveryFee({ distanceKm, config: feeConfig });
  const deliveryFee = subtotal > 0 ? feeCalc.fee : 0;
  const serviceFee = subtotal > 0 ? feeConfig.serviceFee : 0;
  const processingFee = subtotal > 0 ? feeConfig.processingFee : 0;
  // Filter credits: must be from a DIFFERENT merchant than the current cart
  const cartMerchantId = items[0]?.merchant_id;
  const eligibleCredit = credits.find((c) => c.source_merchant_id !== cartMerchantId);
  const grossTotal = Math.max(0, subtotal + deliveryFee + serviceFee + processingFee - discount);
  const creditApplied = useCredit && eligibleCredit ? Math.min(Number(eligibleCredit.amount), grossTotal) : 0;
  const creditLeftover = useCredit && eligibleCredit ? Math.max(0, Number(eligibleCredit.amount) - creditApplied) : 0;
  const total = Math.max(0, grossTotal - creditApplied);

  useEffect(() => {
    if (!user) return;
    supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).then(({ data }) => {
      setAddresses(data ?? []);
      const def = data?.find((a) => a.is_default) ?? data?.[0];
      if (def) setAddrId(def.id);
    });
    // Load active credits with source merchant id
    supabase.from("order_credits").select("*").eq("user_id", user.id).eq("status", "active").then(async ({ data }) => {
      if (!data || data.length === 0) { setCredits([]); return; }
      const ids = data.map((c: any) => c.source_order_id);
      const { data: ord } = await supabase.from("orders").select("id,merchant_id").in("id", ids);
      const m = new Map((ord ?? []).map((o: any) => [o.id, o.merchant_id]));
      setCredits(data.map((c: any) => ({ ...c, source_merchant_id: m.get(c.source_order_id) })));
    });
  }, [user]);

  useEffect(() => {
    const mid = items[0]?.merchant_id;
    if (!mid) { setMerchant(null); return; }
    supabase.from("merchants").select("id,latitude,longitude,name,delivery_radius_km").eq("id", mid).maybeSingle().then(({ data }) => setMerchant(data));
  }, [items[0]?.merchant_id]);

  const radiusKm = Number(merchant?.delivery_radius_km ?? 10);
  const outOfRange = distanceKm != null && distanceKm > radiusKm;

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    const { data: rows } = await supabase.rpc("validate_promotion", { _code: promoCode.trim() });
    const data: any = Array.isArray(rows) ? rows[0] : rows;
    if (!data) { toast.error("Invalid promo code"); setDiscount(0); return; }
    if (data.applies_to === "merchant" && data.merchant_id && data.merchant_id !== items[0]?.merchant_id) {
      toast.error("This promo is not valid for this merchant"); setDiscount(0); return;
    }
    if (data.min_order_amount && subtotal < Number(data.min_order_amount)) { toast.error(`Min order RM${data.min_order_amount}`); return; }
    let d = data.type === "percent" ? subtotal * (Number(data.value) / 100) : Number(data.value);
    const maxD = data.max_discount;
    if (maxD != null && d > Number(maxD)) d = Number(maxD);
    d = Math.min(d, subtotal);
    setDiscount(d);
    toast.success(`Promo applied: -RM${d.toFixed(2)}`);
  };


  const placeOrder = async () => {
    if (!user || !addrId || items.length === 0) { toast.error("Select address and add items"); return; }
    if (outOfRange) { toast.error(`${merchant?.name ?? "This merchant"} only delivers within ${radiusKm} km. You are ${distanceKm!.toFixed(1)} km away.`); return; }
    if (deliveryType === "scheduled" && (!scheduledAt || new Date(scheduledAt) <= new Date())) { toast.error("Pick a future date/time for scheduled delivery"); return; }
    // Cart limit guards (defensive)
    const cyl = items.filter((it: any) => it.category_slug === "cylinder" || it.category_slug === "lpg-refill").reduce((a, x) => a + x.quantity, 0);
    if (cyl > 2) { toast.error("Maximum 2 cylinders (LPG Refill / Cylinder Gas) per transaction."); return; }
    if (items.some((it: any) => it.category_slug === "industrial-gas")) {
      const { data: v } = await supabase.from("company_verifications").select("status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (v?.status !== "approved") { toast.error("Company account required for industrial gas."); return; }
    }
    setBusy(true);
    const addr2 = addresses.find((a) => a.id === addrId);
    const merchant_id = items[0].merchant_id;

    const { data: order, error } = await supabase.from("orders").insert({
      customer_id: user.id,
      merchant_id,
      address_snapshot: addr2 as any,
      items_subtotal: subtotal,
      delivery_fee: deliveryFee,
      service_fee: serviceFee,
      processing_fee: processingFee,
      discount: discount + creditApplied,
      total_amount: total,
      payment_method: paymentMethod,
      payment_status: total === 0 ? "paid" : "pending",
      status: "pending",
      delivery_type: deliveryType,
      scheduled_at: deliveryType === "scheduled" ? scheduledAt : null,
      notes: [notes, creditApplied > 0 ? `Store credit applied: RM ${creditApplied.toFixed(2)} (from order ${eligibleCredit?.source_order_id?.slice(0,8)})` : null].filter(Boolean).join(" · "),
      promotion_code: promoCode || null,
    }).select().single();

    if (error || !order) { toast.error(error?.message ?? "Order failed"); setBusy(false); return; }

    const CATEGORY_LABEL: Record<string, string> = {
      "lpg-refill": "LPG Refill",
      "cylinder": "New Cylinder Gas",
      "industrial-gas": "Industrial Gas",
      "accessories": "Accessories",
    };
    const buildName = (it: any) => {
      const catLabel = it.category_slug ? CATEGORY_LABEL[it.category_slug] ?? null : null;
      const parts = [catLabel, it.name].filter(Boolean);
      return parts.join(", ");
    };
    const orderItems = items.map((it) => ({
      order_id: order.id,
      product_id: it.product_id,
      product_name: buildName(it),
      product_image_url: it.image_url,
      type: (it.type === "new" ? "new_cylinder" : it.type) as "refill" | "new_cylinder" | "deposit",
      cylinder_size_kg: it.cylinder_size_kg,
      quantity: it.quantity,
      unit_price: it.unit_price,
      subtotal: it.unit_price * it.quantity,
    }));
    await supabase.from("order_items").insert(orderItems);

    // Mark credit as used + create leftover refund if any
    if (creditApplied > 0 && eligibleCredit) {
      await supabase.from("order_credits").update({
        status: "used",
        used_order_id: order.id,
        leftover_amount: creditLeftover,
        notes: creditLeftover > 0 ? `Leftover RM ${creditLeftover.toFixed(2)} to be refunded by admin` : null,
      }).eq("id", eligibleCredit.id);

      if (creditLeftover > 0) {
        await supabase.from("refunds").insert({
          order_id: eligibleCredit.source_order_id,
          requester_id: user.id,
          reason: `Leftover credit refund (used RM ${creditApplied.toFixed(2)} on new order ${order.code})`,
          reason_category: "credit_leftover",
          amount: creditLeftover,
          refund_amount: creditLeftover,
          status: "requested",
        });
        toast.info(`Admin will refund the remaining RM ${creditLeftover.toFixed(2)}.`);
      }
    }

    clear();

    // Online payment via dummy gateway
    if (total > 0 && paymentMethod !== "cod") {
      nav(`/user/payment/${order.id}`);
      return;
    }

    toast.success("Order placed!");
    nav(`/user/orders/${order.id}`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Checkout</h1>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm font-semibold"><span>Delivery address</span>
          <Button variant="link" size="sm" onClick={() => nav("/user/addresses")}>Manage</Button>
        </div>
        {addresses.length === 0 && <Card className="p-3 text-sm text-muted-foreground">Add an address first.</Card>}
        {addr && (
          <Card className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-1 text-sm font-medium"><MapPin className="h-3 w-3" />{addr.label ?? "Address"}</div>
                <div className="mt-1 text-xs text-muted-foreground">{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}, {addr.postcode} {addr.city}</div>
              </div>
              {(addr.recipient_name || addr.recipient_phone) && (
                <div className="shrink-0 text-right text-xs">
                  {addr.recipient_name && <div className="font-medium">{addr.recipient_name}</div>}
                  {addr.recipient_phone && <div className="text-muted-foreground">{addr.recipient_phone}</div>}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">Items</div>
        <Card className="divide-y">
          {items.map((it) => (
            <div key={`${it.product_id}-${it.type}`} className="p-3 text-sm">
              <div className="flex justify-between">
                <span>{it.name} × {it.quantity}</span>
                <span>RM {(it.unit_price * it.quantity).toFixed(2)}</span>
              </div>
              {it.type === "new" && it.category_slug !== "accessories" && it.category_slug !== "lpg-refill" && (it.new_cylinder_price != null || it.refill_price != null) && (
                <div className="mt-1 space-y-0.5 pl-3 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>· New cylinder (tong)</span><span>RM {(Number(it.new_cylinder_price ?? 0) * it.quantity).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>· Refill (gas)</span><span>RM {(Number(it.refill_price ?? 0) * it.quantity).toFixed(2)}</span></div>
                </div>
              )}
              {it.type === "new" && it.category_slug === "lpg-refill" && it.refill_price != null && (
                <div className="mt-1 space-y-0.5 pl-3 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>· Refill (gas)</span><span>RM {(Number(it.refill_price ?? 0) * it.quantity).toFixed(2)}</span></div>
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>


      <div>
        <div className="mb-2 text-sm font-semibold">Promo code</div>
        <div className="flex gap-2">
          <Input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Enter code" />
          <Button variant="outline" onClick={applyPromo}>Apply</Button>
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">Delivery time</div>
        <RadioGroup value={deliveryType} onValueChange={(v) => setDeliveryType(v as any)} className="grid grid-cols-2 gap-2">
          <Card className="flex items-center gap-2 p-3"><RadioGroupItem value="immediate" id="dt-now" /><Label htmlFor="dt-now" className="cursor-pointer text-sm">Send now</Label></Card>
          <Card className="flex items-center gap-2 p-3"><RadioGroupItem value="scheduled" id="dt-sch" /><Label htmlFor="dt-sch" className="cursor-pointer text-sm">Schedule</Label></Card>
        </RadioGroup>
        {deliveryType === "scheduled" && (
          <Input type="datetime-local" className="mt-2" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)} />
        )}
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">Payment method</div>
        <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="grid grid-cols-2 gap-2">
          {[
            { id: "cod", label: <>COD <br />(Cash on Delivery)</> },
            { id: "fpx", label: <>FPX <br />(Online Transfer)</> },
            { id: "card", label: "Credit Card" },
            { id: "ewallet", label: "E-Wallet" }
          ].map((m) => (
            <Card key={m.id} className="flex items-center gap-2 p-3">
              <RadioGroupItem value={m.id} id={m.id} />
              <Label htmlFor={m.id} className="cursor-pointer text-sm">{m.label}</Label>
            </Card>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-semibold">Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions" maxLength={500} />
      </div>

      <Card className="space-y-1 p-3 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>RM {subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between">
          <span>Service fee</span>
          <span>RM {serviceFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery fee {distanceKm != null && <span className="text-xs text-muted-foreground">({distanceKm.toFixed(1)} km)</span>}</span>
          <span>RM {deliveryFee.toFixed(2)}</span>
        </div>
        {subtotal > 0 && (
          <div className="text-[10px] text-muted-foreground">
            RM{feeConfig.deliveryBaseFee.toFixed(2)} for first {feeConfig.deliveryBaseKm} km
            {feeCalc.extraKm > 0 && <> · +{feeCalc.extraKm} km × RM{feeConfig.deliveryPerKm.toFixed(2)} = RM{feeCalc.breakdown.extra.toFixed(2)}</>}
            {distanceKm == null && " · estimated, set address coordinates for accurate fee"}
          </div>
        )}
        <div className="flex justify-between">
          <span>Processing fee</span>
          <span>RM {processingFee.toFixed(2)}</span>
        </div>
        {discount > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span>- RM {discount.toFixed(2)}</span></div>}
        {eligibleCredit && (
          <div className="mt-1 rounded-md border border-primary/30 bg-primary/5 p-2">
            <label className="flex items-start gap-2 text-xs">
              <input type="checkbox" className="mt-0.5" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} />
              <span className="flex-1">
                Apply store credit <span className="font-semibold">RM {Number(eligibleCredit.amount).toFixed(2)}</span> from rejected order.
                {creditApplied > 0 && creditLeftover > 0 && (
                  <span className="mt-1 block text-muted-foreground">Leftover RM {creditLeftover.toFixed(2)} will be refunded by admin.</span>
                )}
              </span>
            </label>
            {creditApplied > 0 && (
              <div className="mt-1 flex justify-between font-medium text-primary"><span>Credit applied</span><span>- RM {creditApplied.toFixed(2)}</span></div>
            )}
          </div>
        )}
        <div className="mt-1 flex justify-between border-t pt-2 font-bold"><span>Total</span><span className="text-primary">RM {total.toFixed(2)}</span></div>
      </Card>

      {outOfRange && (
        <Card className="border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {merchant?.name ?? "This merchant"} only delivers within {radiusKm} km. Your selected address is {distanceKm!.toFixed(1)} km away — please choose a different address or merchant.
        </Card>
      )}

      <Button className="w-full" onClick={() => setConfirmOpen(true)} disabled={busy || items.length === 0 || !addrId || outOfRange}>
        {busy ? "Placing…" : `Place order · RM ${total.toFixed(2)}`}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ready to place your order?</AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm your delivery details, payment method and total amount before we process your order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items ({items.reduce((n, it) => n + it.quantity, 0)})</div>
              <ul className="space-y-1">
                {items.map((it) => {
                  const catLabel = ({ "lpg-refill": "LPG Refill", "cylinder": "New Cylinder Gas", "industrial-gas": "Industrial Gas", "accessories": "Accessories" } as Record<string, string>)[it.category_slug ?? ""] ?? null;
                  const fullName = [catLabel, it.name].filter(Boolean).join(", ");
                  return (
                    <li key={`${it.product_id}-${it.type}`} className="flex justify-between gap-2">
                      <span className="font-medium">{fullName} × {it.quantity}</span>
                      <span className="text-muted-foreground">RM {(it.unit_price * it.quantity).toFixed(2)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            {addr && (
              <div className="border-t pt-2"><span className="text-muted-foreground">Deliver to: </span><span className="font-medium">{addr.label ?? "Address"} — {addr.address_line1}, {addr.postcode} {addr.city}</span></div>
            )}
            <div><span className="text-muted-foreground">Payment: </span><span className="font-medium">{paymentMethod === "fpx" ? "FPX (Online Transfer)" : (paymentMethod === "card" ? "Credit Card" : (paymentMethod === "cod" ? "COD (Cash on Delivery)" : paymentMethod.toUpperCase()))}</span></div>
            <div><span className="text-muted-foreground">Total: </span><span className="font-bold text-primary">RM {total.toFixed(2)}</span></div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Review again</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmOpen(false); placeOrder(); }}>Confirm & place order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
