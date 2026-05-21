import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Store, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { haversineKm } from "@/lib/delivery";

export default function UserMerchants() {
  const [params, setParams] = useSearchParams();
  const categoryId = params.get("category");
  const [items, setItems] = useState<any[]>([]);
  const [addr, setAddr] = useState<any>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<any>(null);
  const [merchantIdsInCat, setMerchantIdsInCat] = useState<Set<string> | null>(null);

  useEffect(() => {
    supabase.from("merchants").select("*").eq("status", "active").then(({ data }) => setItems(data ?? []));
    supabase.from("addresses").select("*").eq("is_default", true).maybeSingle().then(({ data }) => setAddr(data));
  }, []);

  useEffect(() => {
    if (!categoryId) { setCategory(null); setMerchantIdsInCat(null); return; }
    supabase.from("categories").select("*").eq("id", categoryId).maybeSingle().then(({ data }) => setCategory(data));
    supabase.from("products").select("merchant_id").eq("category_id", categoryId).eq("is_active", true).then(({ data }) => {
      setMerchantIdsInCat(new Set((data ?? []).map((r: any) => r.merchant_id)));
    });
  }, [categoryId]);

  const withDistance = useMemo(() => items.map((m) => {
    const d = addr?.latitude && addr?.longitude && m.latitude != null && m.longitude != null
      ? haversineKm(addr.latitude, addr.longitude, m.latitude, m.longitude) : null;
    const inRange = d == null ? true : d <= Number(m.delivery_radius_km ?? 10);
    return { ...m, _distance: d, _inRange: inRange };
  }), [items, addr]);

  const filtered = withDistance
    .filter((m) => (merchantIdsInCat ? merchantIdsInCat.has(m.id) : true))
    .filter((m) => m.name.toLowerCase().includes(q.toLowerCase()))
    .filter((m) => m._inRange);

  const clearCategory = () => { params.delete("category"); setParams(params); };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Merchants</h1>
      {category && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            {category.name}
            <button onClick={clearCategory} className="ml-1 rounded-full hover:bg-muted-foreground/20"><X className="h-3 w-3" /></button>
          </Badge>
          <span className="text-xs text-muted-foreground">Kedai yang menjual kategori ini</span>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search merchants" className="pl-9" />
      </div>
      <div className="space-y-2">
        {filtered.map((m) => (
          <Link key={m.id} to={categoryId ? `/user/merchant/${m.id}?category=${categoryId}` : `/user/merchant/${m.id}`}>
            <Card className="flex items-center gap-3 p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                {m.logo_url ? <img src={m.logo_url} alt={m.name} className="h-full w-full rounded-lg object-cover" /> : <Store className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1">
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">
                  {m.city ?? "—"} · ★ {Number(m.rating ?? 0).toFixed(1)}
                  {m._distance != null && <> · {m._distance.toFixed(1)} km</>}
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {categoryId ? "Tiada kedai menjual kategori ini di kawasan anda." : "No merchants deliver to your area."}
          </p>
        )}
      </div>
    </div>
  );
}
