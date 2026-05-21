import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMerchantContext } from "@/hooks/useMerchantContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit } from "lucide-react";
import { toast } from "sonner";

export default function MerchantProducts() {
  const { merchant } = useMerchantContext();
  const [items, setItems] = useState<any[]>([]);
  const load = () => merchant && supabase.from("products").select("*").eq("merchant_id", merchant.id).order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? []));
  useEffect(() => { load(); }, [merchant?.id]);

  const toggle = async (p: any) => {
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) toast.error(error.message); else load();
  };
  const fmt = (n: any) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n||0));

  if (!merchant) return <p className="text-sm text-muted-foreground">No merchant linked.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button asChild><Link to="/merchant/products/new"><Plus className="mr-1 h-4 w-4" />New product</Link></Button>
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40"><tr className="text-left"><th className="p-3">Name</th><th className="p-3">Size</th><th className="p-3">Refill</th><th className="p-3">New</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-3 font-medium">{p.name}{p.is_coming_soon && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Coming Soon</span>}</td>
                <td className="p-3">{p.cylinder_size_kg ?? "—"} kg</td>
                <td className="p-3">{fmt(p.refill_price)}</td>
                <td className="p-3">{fmt(p.new_cylinder_price || p.selling_price)}</td>
                <td className="p-3">{p.stock_qty}</td>
                <td className="p-3"><Button size="sm" variant={p.is_active ? "default" : "outline"} onClick={() => toggle(p)}>{p.is_active ? "Active" : "Inactive"}</Button></td>
                <td className="p-3"><Button asChild size="sm" variant="outline"><Link to={`/merchant/products/${p.id}/edit`}><Edit className="h-3 w-3" /></Link></Button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">No products yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
