import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMerchantContext } from "@/hooks/useMerchantContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000).optional(),
  cylinder_size_kg: z.coerce.number().nonnegative().optional(),
  refill_price: z.coerce.number().nonnegative(),
  selling_price: z.coerce.number().nonnegative(),
  new_cylinder_price: z.coerce.number().nonnegative(),
  deposit_amount: z.coerce.number().nonnegative(),
  stock_qty: z.coerce.number().int().nonnegative(),
  low_stock_threshold: z.coerce.number().int().nonnegative(),
  image_url: z.string().trim().url().optional().or(z.literal("")).nullable(),
  is_coming_soon: z.boolean().optional(),
});

export default function MerchantProductForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const { merchant } = useMerchantContext();
  const [cats, setCats] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    name: "", description: "", cylinder_size_kg: 14, refill_price: 0, selling_price: 0,
    new_cylinder_price: 0, deposit_amount: 0, stock_qty: 0, low_stock_threshold: 5, image_url: "", category_id: "", is_coming_soon: false,
  });

  useEffect(() => { supabase.from("categories").select("*").eq("is_active", true).then(({ data }) => setCats(data ?? [])); }, []);
  useEffect(() => {
    if (!isEdit) return;
    supabase.from("products").select("*").eq("id", id).maybeSingle().then(({ data }) => data && setForm(data));
  }, [id]);

  const save = async () => {
    if (!merchant) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    const payload: any = { ...parsed.data, image_url: parsed.data.image_url || null, category_id: form.category_id || null, merchant_id: merchant.id, name: parsed.data.name! };
    const res = isEdit
      ? await supabase.from("products").update(payload).eq("id", id!)
      : await supabase.from("products").insert([payload]);
    if (res.error) toast.error(res.error.message); else { toast.success("Saved"); nav("/merchant/products"); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isEdit ? "Edit product" : "New product"}</h1>
      <Card className="space-y-4 p-6">
        <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={150} /></div>
        <div><Label>Description</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Category</Label>
            <Select value={form.category_id ?? ""} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Cylinder size (kg)</Label><Input type="number" step="0.1" value={form.cylinder_size_kg ?? ""} onChange={(e) => setForm({ ...form, cylinder_size_kg: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Harga Refill / Gas (RM)</Label>
            <Input type="number" step="0.01" value={form.refill_price} onChange={(e) => setForm({ ...form, refill_price: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">Harga tukar gas sahaja</p>
          </div>
          <div>
            <Label>Harga New Tong / Cylinder (RM)</Label>
            <Input type="number" step="0.01" value={form.new_cylinder_price} onChange={(e) => setForm({ ...form, new_cylinder_price: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">Harga tong kosong. Beli new = tong + refill</p>
          </div>
          <div><Label>Deposit (RM)</Label><Input type="number" step="0.01" value={form.deposit_amount} onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })} /></div>
          <div><Label>Stock qty</Label><Input type="number" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} /></div>
          <div><Label>Low-stock threshold</Label><Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} /></div>
        </div>
        <div><Label>Product image</Label><ImageUpload bucket="product-images" pathPrefix={merchant?.id ?? "p"} value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} aspect="square" /></div>
        <label className="flex items-center gap-2 rounded-md border p-3 text-sm cursor-pointer">
          <input type="checkbox" checked={!!form.is_coming_soon} onChange={(e) => setForm({ ...form, is_coming_soon: e.target.checked })} />
          <div>
            <div className="font-medium">Coming Soon</div>
            <div className="text-xs text-muted-foreground">Produk dipaparkan kepada pelanggan tetapi tidak boleh dibeli.</div>
          </div>
        </label>
        <div className="flex gap-2"><Button onClick={save}>Save</Button><Button variant="outline" onClick={() => nav(-1)}>Cancel</Button></div>
      </Card>
    </div>
  );
}
