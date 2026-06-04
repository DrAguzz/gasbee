import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ImageUpload } from "@/components/ImageUpload";
import { SignedImage } from "@/components/SignedImage";
import { toast } from "sonner";

export default function RiderDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [r, setR] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, delivered: 0, earnings: 0 });

  useEffect(() => {
    if (!id) return;
    supabase.from("riders").select("*").eq("id", id).maybeSingle().then(({ data }) => setR(data));
    supabase.from("orders").select("*").eq("rider_id", id).order("created_at", { ascending: false }).limit(200).then(({ data }) => {
      const list = data ?? [];
      setOrders(list);
      const delivered = list.filter((o: any) => o.status === "delivered");
      setStats({ total: list.length, delivered: delivered.length, earnings: delivered.reduce((a: number, o: any) => a + Number(o.delivery_fee || 0), 0) });
    });
  }, [id]);

  const fmt = (n: any) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n||0));
  if (!r) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const expired = r.license_expiry_date && new Date(r.license_expiry_date) < new Date();

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)}>← Back</Button>
      <div className="flex items-center gap-4">
        {r.profile_image_url ? <SignedImage url={r.profile_image_url} bucket="avatars" className="h-16 w-16 rounded-full object-cover" /> : <div className="h-16 w-16 rounded-full bg-muted" />}
        <div>
          <h1 className="text-2xl font-bold">{r.full_name}</h1>
          <p className="text-sm text-muted-foreground">{r.phone} · <span className="capitalize">{r.vehicle_type ?? "—"}</span> {r.vehicle_plate}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Status</p><div className="mt-2"><StatusBadge value={r.status} /></div></Card>
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Rating</p><p className="text-2xl font-bold">★ {Number(r.rating ?? 0).toFixed(1)}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Delivered</p><p className="text-2xl font-bold">{stats.delivered}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Earnings</p><p className="text-2xl font-bold">{fmt(stats.earnings)}</p></Card>
      </div>

      <Card className="p-4">
        <p className="mb-2 font-semibold">Profile photo</p>
        <ImageUpload
          bucket="avatars"
          pathPrefix={`riders/${r.id}`}
          value={r.profile_image_url}
          onChange={async (url) => {
            const { error } = await supabase.from("riders").update({ profile_image_url: url }).eq("id", r.id);
            if (error) return toast.error(error.message);
            setR({ ...r, profile_image_url: url });
            toast.success("Photo updated");
          }}
          label="Upload photo"
        />
      </Card>

      <Card className="p-4">
        <p className="font-semibold">License</p>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <div className="space-y-1 text-sm">
            <p>License no: <span className="font-medium">{r.license_no ?? "—"}</span></p>
            <p>Expiry: <span className={expired ? "font-semibold text-destructive" : "font-medium"}>{r.license_expiry_date ? new Date(r.license_expiry_date).toLocaleDateString() : "—"}{expired ? " (expired)" : ""}</span></p>
          </div>
          {r.license_image_url ? <SignedImage url={r.license_image_url} bucket="rider-docs" className="rounded-md border" /> : <p className="text-sm text-muted-foreground">No license uploaded.</p>}
        </div>
        <div className="mt-3">
          <ImageUpload
            bucket="rider-docs"
            pathPrefix={`licenses/${r.id}`}
            value={r.license_image_url}
            onChange={async (url) => {
              const { error } = await supabase.from("riders").update({ license_image_url: url }).eq("id", r.id);
              if (error) return toast.error(error.message);
              setR({ ...r, license_image_url: url });
              toast.success("License updated");
            }}
            label="Upload license"
            aspect="wide"
          />
        </div>
      </Card>

      <Card>
        <div className="border-b p-3 font-semibold">Delivery history</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr className="text-left text-xs uppercase text-muted-foreground"><th className="p-3">Code</th><th className="p-3">Status</th><th className="p-3">Fee</th><th className="p-3">Total</th><th className="p-3">Date</th><th className="p-3"></th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3 font-mono">{o.code}</td>
                <td className="p-3"><StatusBadge value={o.status} /></td>
                <td className="p-3">{fmt(o.delivery_fee)}</td>
                <td className="p-3 font-semibold">{fmt(o.total_amount)}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                <td className="p-3 text-right"><Button asChild size="sm" variant="outline"><Link to={`/orders/${o.id}`}>View</Link></Button></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No deliveries.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
