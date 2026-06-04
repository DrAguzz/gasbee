import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Minus, Plus, Building2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useCompanyVerification } from "@/hooks/useCompanyVerification";
import { toast } from "sonner";

export default function UserProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { add } = useCart();
  const { status: verifStatus, isApproved } = useCompanyVerification();
  const [p, setP] = useState<any>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!id) return;
    supabase.from("products").select("*, merchants(name), categories(slug,name)").eq("id", id).maybeSingle().then(({ data }) => {
      setP(data);
    });
  }, [id]);

  if (!p) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const slug = p.categories?.slug as string | undefined;
  const isIndustrial = slug === "industrial-gas";
  const blockedIndustrial = isIndustrial && !isApproved;

  const isLpgRefill = slug === "lpg-refill";
  const isAccessories = slug === "accessories";
  const rawNewCylinder = Number(p.new_cylinder_price || 0);
  // LPG Refill: never include new-cylinder cost. Accessories: use selling_price only.
  const newCylinderPrice = isLpgRefill ? 0 : (isAccessories ? 0 : (rawNewCylinder || Number(p.selling_price || 0)));
  const refillPrice = isAccessories ? 0 : Number(p.refill_price || 0);
  const depositAmount = Number(p.deposit_amount || 0);
  const accessoryPrice = isAccessories ? Number(p.selling_price || 0) : 0;
  const newCylTotal = newCylinderPrice + refillPrice;

  // Auto-detect type by category first
  const type: "refill" | "new" | "deposit" =
    isLpgRefill ? "refill"
    : isAccessories ? "new"
    : newCylinderPrice > 0 ? "new"
    : refillPrice > 0 ? "refill"
    : "deposit";
  const price = isAccessories ? accessoryPrice
    : type === "refill" ? refillPrice
    : type === "new" ? newCylTotal
    : depositAmount;

  const addToCart = () => {
    if (blockedIndustrial) {
      toast.error("Company account required for industrial gas.");
      return;
    }
    const res = add({
      product_id: p.id,
      merchant_id: p.merchant_id,
      name: p.name,
      image_url: p.image_url,
      type, cylinder_size_kg: p.cylinder_size_kg,
      unit_price: price, quantity: qty,
      category_slug: slug ?? null,
      new_cylinder_price: type === "new" ? newCylinderPrice : null,
      refill_price: type === "new" ? refillPrice : null,
    });
    if (!res.ok) { toast.error(res.error!); return; }
    toast.success("Added to cart");
    nav("/user/cart");
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex h-48 items-center justify-center bg-muted">
          {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> : <Flame className="h-16 w-16 text-primary" />}
        </div>
      </Card>
      <div>
        <div className="text-xs text-muted-foreground">{p.merchants?.name} {p.categories?.name && <>· {p.categories.name}</>}</div>
        <h1 className="text-xl font-bold">{p.name}{p.is_coming_soon && <span className="ml-2 rounded bg-muted px-2 py-0.5 align-middle text-xs font-medium text-muted-foreground">Coming Soon</span>}</h1>
        {!isAccessories && Number(p.cylinder_size_kg) > 0 && <div className="text-sm text-muted-foreground">{p.cylinder_size_kg} kg cylinder</div>}
        {p.description && <p className="mt-2 text-sm">{p.description}</p>}
      </div>

      {isIndustrial && (
        <Card className={`p-3 text-sm ${isApproved ? "border-primary bg-primary/5" : "border-amber-500 bg-amber-500/10"}`}>
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 mt-0.5" />
            <div className="flex-1">
              {isApproved ? (
                <span className="text-xs">✓ Your company account is approved.</span>
              ) : verifStatus === "pending" ? (
                <span className="text-xs">⏳ Company application is under review.</span>
              ) : (
                <>
                  <p className="font-semibold">Industrial gas — company registration required</p>
                  <p className="text-xs text-muted-foreground">SSM document upload required to purchase industrial gas.</p>
                  <Button asChild size="sm" className="mt-2"><Link to="/user/company-verification">Register company</Link></Button>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {isAccessories ? (
        <div className="text-sm"><span className="text-muted-foreground">Unit price: </span><span className="font-semibold text-primary">RM {accessoryPrice.toFixed(2)}</span></div>
      ) : type === "new" ? (
        <Card className="space-y-1 p-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">New cylinder (tong)</span><span>RM {newCylinderPrice.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Refill (gas)</span><span>RM {refillPrice.toFixed(2)}</span></div>
          <div className="flex justify-between border-t pt-1 font-semibold"><span>Unit price</span><span className="text-primary">RM {newCylTotal.toFixed(2)}</span></div>
        </Card>
      ) : type === "refill" ? (
        <div className="text-sm"><span className="text-muted-foreground">Unit price: </span><span className="font-semibold text-primary">RM {refillPrice.toFixed(2)}</span></div>
      ) : (
        <div className="text-sm"><span className="text-muted-foreground">Deposit: </span><span className="font-semibold text-primary">RM {depositAmount.toFixed(2)}</span></div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm">Quantity</div>
        <div className="flex items-center gap-3">
          <Button size="icon" variant="outline" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></Button>
          <span className="w-6 text-center font-semibold">{qty}</span>
          <Button size="icon" variant="outline" onClick={() => setQty(qty + 1)}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="sticky bottom-20 flex items-center justify-between rounded-lg border bg-card p-3">
        <div>
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-lg font-bold text-primary">RM {(price * qty).toFixed(2)}</div>
        </div>
        <Button onClick={addToCart} disabled={price <= 0 || blockedIndustrial || p.is_coming_soon}>{p.is_coming_soon ? "Coming Soon" : "Add to cart"}</Button>
      </div>
    </div>
  );
}
