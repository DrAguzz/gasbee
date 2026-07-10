import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Flame, MapPin, Phone, AlertTriangle, X } from "lucide-react";
import { haversineKm } from "@/lib/delivery";

export default function UserMerchantDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const categoryId = params.get("category");
  const [m, setM] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [addr, setAddr] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, { name: string; slug: string }>>({});

  useEffect(() => {
    if (!id) return;
    supabase.from("merchants_public").select("*").eq("id", id).maybeSingle().then(({ data }) => setM(data));
    let qb = supabase.from("products").select("*").eq("merchant_id", id).eq("is_active", true);
    if (categoryId) qb = qb.eq("category_id", categoryId);
    qb.then(({ data }) => setProducts(data ?? []));
    supabase.from("addresses").select("*").eq("is_default", true).maybeSingle().then(({ data }) => setAddr(data));
    supabase.from("categories").select("id,name,slug").then(({ data }) => {
      const map: Record<string, { name: string; slug: string }> = {};
      (data ?? []).forEach((c: any) => { map[c.id] = { name: c.name, slug: c.slug }; });
      setCategoriesMap(map);
    });
    if (categoryId) {
      supabase.from("categories").select("*").eq("id", categoryId).maybeSingle().then(({ data }) => setCategory(data));
    } else {
      setCategory(null);
    }
  }, [id, categoryId]);



  if (!m) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const distance = addr?.latitude && addr?.longitude && m.latitude != null && m.longitude != null
    ? haversineKm(addr.latitude, addr.longitude, m.latitude, m.longitude) : null;
  const radius = Number(m.delivery_radius_km ?? 10);
  const outOfRange = distance != null && distance > radius;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
            {m.logo_url ? <img src={m.logo_url} alt={m.name} className="h-full w-full rounded-lg object-cover" /> : <Store className="h-6 w-6 text-primary" />}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{m.name}</h1>
            <div className="text-xs text-muted-foreground">★ {Number(m.rating ?? 0).toFixed(1)} · {m.total_orders} orders</div>
          </div>
        </div>
        {m.description && <p className="mt-3 text-sm text-muted-foreground">{m.description}</p>}
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          {m.address && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.address}, {m.city}</div>}
          {m.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</div>}
          <div>Delivers within {radius} km{distance != null && <> · You are {distance.toFixed(1)} km away</>}</div>
        </div>
      </Card>

      {outOfRange && (
        <Card className="flex items-start gap-2 border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            This merchant does not deliver to your area. You are {distance!.toFixed(1)} km away but they only cover {radius} km.
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Products{category && <> · {category.name}</>}</h2>
        {category && (
          <Badge variant="secondary" className="gap-1">
            {category.name}
            <button onClick={() => { params.delete("category"); setParams(params); }} className="ml-1 rounded-full hover:bg-muted-foreground/20"><X className="h-3 w-3" /></button>
          </Badge>
        )}
      </div>
      {(() => {
        const SECTIONS: { slug: string; label: string; withSizes: boolean }[] = [
          { slug: "lpg-refill", label: "LPG Refill (Gas Refill + Exchange Empty Cylinder)", withSizes: true },
          { slug: "cylinder", label: "New Cylinder Gas (Gas Refill + New Cylinder Deposit Fee)", withSizes: true },
          { slug: "industrial-gas", label: "Industrial Gas", withSizes: true },
          { slug: "accessories", label: "Accessories / Inspection", withSizes: false },
        ];

        const renderCard = (p: any) => {
          const cs = p.is_coming_soon;
          const disabled = outOfRange || cs;
          const inner = (
            <Card className={`overflow-hidden relative ${disabled ? "opacity-60 grayscale" : ""}`}>
              <div className="flex h-24 items-center justify-center bg-muted">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> : <Flame className="h-8 w-8 text-primary" />}
              </div>
              {cs && <span className="absolute right-1 top-1 rounded bg-muted-foreground/80 px-1.5 py-0.5 text-[10px] font-medium text-background">Coming Soon</span>}
              <div className="p-2">
                <div className="line-clamp-1 text-sm font-medium">{p.name}</div>
                {(() => {
                  const slug = categoriesMap[p.category_id]?.slug;
                  const refill = Number(p.refill_price || 0);
                  const newCyl = Number(p.new_cylinder_price || 0);
                  const sell = Number(p.selling_price || 0);
                  const price = slug === "cylinder"
                    ? (newCyl + refill) || sell
                    : slug === "accessories"
                      ? sell
                      : refill || sell;
                  return (
                    <>
                      <div className="mt-1 text-sm font-bold text-primary">RM {price.toFixed(2)}</div>
                      {slug === "cylinder" && newCyl > 0 && (
                        <div className="text-[10px] text-muted-foreground">Tong RM {newCyl.toFixed(2)} + Gas RM {refill.toFixed(2)}</div>
                      )}
                    </>
                  );
                })()}

              </div>
            </Card>
          );
          return disabled ? (
            <div key={p.id} aria-disabled className="cursor-not-allowed">{inner}</div>
          ) : (
            <Link key={p.id} to={`/user/product/${p.id}`}>{inner}</Link>
          );
        };

        const bySlug: Record<string, any[]> = {};
        const others: any[] = [];
        products.forEach((p) => {
          const slug = categoriesMap[p.category_id]?.slug;
          if (slug && SECTIONS.some((s) => s.slug === slug)) {
            (bySlug[slug] ||= []).push(p);
          } else {
            others.push(p);
          }
        });

        const sections = SECTIONS.filter((s) => (bySlug[s.slug]?.length ?? 0) > 0);

        if (sections.length === 0 && others.length === 0) {
          return <p className="text-sm text-muted-foreground">No products available.</p>;
        }

        return (
          <div className="space-y-6">
            {sections.map((s) => {
              const list = (bySlug[s.slug] ?? []).slice().sort((a, b) => {
                const sa = Number(a.cylinder_size_kg) || 0;
                const sb = Number(b.cylinder_size_kg) || 0;
                if (sa === 0 && sb !== 0) return 1;
                if (sb === 0 && sa !== 0) return -1;
                return sa - sb;
              });
              return (
                <section key={s.slug} className="space-y-2">
                  <h3 className="text-sm font-semibold">{s.label}</h3>
                  <div className="grid grid-cols-2 gap-3">{list.map(renderCard)}</div>
                </section>
              );
            })}

            {others.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Other</h3>
                <div className="grid grid-cols-2 gap-3">{others.map(renderCard)}</div>
              </section>
            )}
          </div>
        );
      })()}

    </div>
  );
}
