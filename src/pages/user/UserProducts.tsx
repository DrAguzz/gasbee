import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Flame } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

export default function UserProducts() {
  const [params] = useSearchParams();
  const cat = params.get("category");
  const initialQ = params.get("q") ?? "";
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState(initialQ);

  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  useEffect(() => {
    (async () => {
      let query = supabase.from("products").select("*, merchants(name, status)").eq("is_active", true);
      if (cat) query = query.eq("category_id", cat);
      const { data } = await query.limit(50);
      setItems((data ?? []).filter((p: any) => p.merchants?.status === "active"));
    })();
  }, [cat]);

  const filtered = items.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Products</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="pl-9" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((p) => {
          const cs = p.is_coming_soon;
          const inner = (
            <Card className={`overflow-hidden relative ${cs ? "opacity-60 grayscale" : ""}`}>
              <div className="flex h-24 items-center justify-center bg-muted">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> : <Flame className="h-8 w-8 text-primary" />}
              </div>
              {cs && <span className="absolute right-1 top-1 rounded bg-muted-foreground/80 px-1.5 py-0.5 text-[10px] font-medium text-background">Coming Soon</span>}
              <div className="p-2">
                <div className="line-clamp-1 text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.merchants?.name}</div>
                <div className="mt-1 text-sm font-bold text-primary">RM {Number(p.refill_price || p.selling_price).toFixed(2)}</div>
              </div>
            </Card>
          );
          return cs ? (
            <div key={p.id} aria-disabled className="cursor-not-allowed">{inner}</div>
          ) : (
            <Link key={p.id} to={`/user/product/${p.id}`}>{inner}</Link>
          );
        })}
        {filtered.length === 0 && <p className="col-span-2 text-sm text-muted-foreground">No products found.</p>}
      </div>
    </div>
  );
}
