import { useCart, CYLINDER_LIMIT, cylinderTotal, hasIndustrial } from "@/hooks/useCart";
import { useCompanyVerification } from "@/hooks/useCompanyVerification";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Minus, Plus, Flame, AlertTriangle, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function UserCart() {
  const { items, setQty, remove, subtotal } = useCart();
  const { isApproved, status } = useCompanyVerification();

  const cylinders = cylinderTotal(items);
  const industrialBlocked = hasIndustrial(items) && !isApproved;

  const inc = (pid: string, t: string, q: number) => {
    const r = setQty(pid, t, q);
    if (!r.ok) toast.error(r.error!);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Flame className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Your cart is empty.</p>
        <Button asChild><Link to="/user/products">Browse products</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-bold">Cart</h1>

      {cylinders > 0 && (
        <Card className={`p-2 text-xs ${cylinders >= CYLINDER_LIMIT ? "border-amber-500 bg-amber-500/10" : ""}`}>
          Cylinders (LPG Refill / Cylinder Gas): <strong>{cylinders}/{CYLINDER_LIMIT}</strong> per transaction.
        </Card>
      )}

      {industrialBlocked && (
        <Card className="border-destructive bg-destructive/10 p-3 text-sm">
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Company account required</p>
              <p className="text-xs">{status === "pending" ? "Your company application is under review." : "Register company & upload SSM to proceed."}</p>
              {status !== "pending" && (
                <Button asChild size="sm" className="mt-2"><Link to="/user/company-verification">Register now</Link></Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {items.map((it) => (
        <Card key={`${it.product_id}-${it.type}`} className="flex items-center gap-3 p-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
            {it.image_url ? <img src={it.image_url} alt={it.name} className="h-full w-full rounded-lg object-cover" /> : <Flame className="h-5 w-5 text-primary" />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">{it.name}</div>
            {it.category_slug === "industrial-gas" && <div className="text-xs text-muted-foreground">industrial</div>}
            <div className="text-sm font-semibold text-primary">RM {it.unit_price.toFixed(2)}</div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => inc(it.product_id, it.type, it.quantity - 1)}><Minus className="h-3 w-3" /></Button>
            <span className="w-5 text-center text-sm">{it.quantity}</span>
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => inc(it.product_id, it.type, it.quantity + 1)}><Plus className="h-3 w-3" /></Button>
          </div>
          <Button size="icon" variant="ghost" onClick={() => remove(it.product_id, it.type)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </Card>
      ))}
      <div className="sticky bottom-20 rounded-lg border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm">Subtotal</span>
          <span className="text-lg font-bold text-primary">RM {subtotal.toFixed(2)}</span>
        </div>
        <Button asChild className="w-full" disabled={industrialBlocked}>
          <Link to="/user/checkout">Checkout</Link>
        </Button>
      </div>
    </div>
  );
}
