import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

interface Banner { id: string; title: string | null; image_url: string; link_url: string | null; }

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const cur = banners[idx];
  const inner = (
    <Card className="overflow-hidden bg-muted">
      <img src={cur.image_url} alt={cur.title ?? ""} className="h-auto w-full object-contain transition-opacity duration-500 sm:h-36 sm:object-cover" />
    </Card>
  );

  return (
    <div className="space-y-2">
      {cur.link_url ? <a href={cur.link_url}>{inner}</a> : inner}
      {banners.length > 1 && (
        <div className="flex justify-center gap-1">
          {banners.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-muted"}`} aria-label={`Banner ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}
