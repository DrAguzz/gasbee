import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchantContext } from "@/hooks/useMerchantContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ImageUpload";
import { Plus, Trash2, Pencil } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { toast } from "sonner";
import { z } from "zod";

const VEHICLES = [
  { value: "motorcycle", label: "Motorcycle" },
  { value: "car", label: "Car" },
  { value: "lorry", label: "Lorry" },
];

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  vehicle_type: z.enum(["motorcycle","car","lorry"]),
  vehicle_plate: z.string().trim().max(20).optional(),
  license_no: z.string().trim().max(50).optional(),
});

export default function MerchantRiders() {
  const { merchant } = useMerchantContext();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ full_name: "", phone: "", email: "", password: "", vehicle_type: "motorcycle", vehicle_plate: "", license_no: "" });

  const load = () => merchant && supabase.from("riders").select("*").eq("merchant_id", merchant.id).order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? []));
  useEffect(() => { load(); }, [merchant?.id]);

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("merchant-create-rider", {
      body: parsed.data,
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    setBusy(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error ?? error?.message ?? "Failed"); return; }
    toast.success("Rider added");
    setOpen(false);
    setForm({ full_name: "", phone: "", email: "", password: "", vehicle_type: "motorcycle", vehicle_plate: "", license_no: "" });
    load();
  };

  const toggle = async (r: any) => {
    const { error } = await supabase.from("riders").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) toast.error(error.message); else load();
  };
  const del = async (r: any) => {
    if (!confirm(`Remove rider ${r.full_name}?`)) return;
    const { error } = await supabase.from("riders").delete().eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("Removed"); load(); }
  };

  if (!merchant) return <p className="text-sm text-muted-foreground">No merchant linked.</p>;

  const isExpired = (d?: string | null) => d && new Date(d) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Riders</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Register rider</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Register new rider</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Full name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div><Label>Password *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Vehicle type *</Label>
                  <Select value={form.vehicle_type} onValueChange={(v) => setForm({ ...form, vehicle_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{VEHICLES.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Plate</Label><Input value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} /></div>
              </div>
              <div><Label>License no.</Label><Input value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} /></div>
              <p className="text-xs text-muted-foreground">After creation, edit the rider to upload license & profile photos.</p>
              <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create rider"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40"><tr className="text-left"><th className="p-3">Rider</th><th className="p-3">Vehicle</th><th className="p-3">License expiry</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {r.profile_image_url ? <img src={r.profile_image_url} className="h-8 w-8 rounded-full object-cover" /> : <div className="h-8 w-8 rounded-full bg-muted" />}
                    <div><div>{r.full_name}</div><div className="text-xs text-muted-foreground">{r.phone}</div></div>
                  </div>
                </td>
                <td className="p-3 capitalize">{r.vehicle_type ?? "—"} {r.vehicle_plate ?? ""}</td>
                <td className="p-3">
                  {r.license_expiry_date ? (
                    <span className={isExpired(r.license_expiry_date) ? "font-semibold text-destructive" : ""}>
                      {new Date(r.license_expiry_date).toLocaleDateString()}{isExpired(r.license_expiry_date) ? " (expired)" : ""}
                    </span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="p-3"><StatusBadge value={r.status} /></td>
                <td className="p-3 text-right">
                  <span className="mr-3 inline-flex items-center gap-2 align-middle">
                    <Switch checked={!!r.is_active} onCheckedChange={() => toggle(r)} className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-muted-foreground/40" />
                  </span>
                  <Button size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">No riders yet.</td></tr>}
          </tbody>
        </table>
      </Card>

      {editing && <EditRiderDialog rider={editing} onClose={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function EditRiderDialog({ rider, onClose }: { rider: any; onClose: () => void }) {
  const [r, setR] = useState<any>(rider);
  const save = async () => {
    const { error } = await supabase.from("riders").update({
      full_name: r.full_name, phone: r.phone,
      vehicle_type: r.vehicle_type, vehicle_plate: r.vehicle_plate,
      license_no: r.license_no, license_image_url: r.license_image_url,
      license_expiry_date: r.license_expiry_date || null, profile_image_url: r.profile_image_url,
    }).eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); onClose(); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit rider</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Profile photo</Label><ImageUpload bucket="rider-docs" pathPrefix={`${r.id}/profile`} value={r.profile_image_url} onChange={(url) => setR({ ...r, profile_image_url: url })} /></div>
          <div><Label>Full name</Label><Input value={r.full_name ?? ""} onChange={(e) => setR({ ...r, full_name: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={r.phone ?? ""} onChange={(e) => setR({ ...r, phone: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Vehicle type</Label>
              <Select value={r.vehicle_type ?? "motorcycle"} onValueChange={(v) => setR({ ...r, vehicle_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VEHICLES.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Plate</Label><Input value={r.vehicle_plate ?? ""} onChange={(e) => setR({ ...r, vehicle_plate: e.target.value })} /></div>
          </div>
          <div><Label>License no.</Label><Input value={r.license_no ?? ""} onChange={(e) => setR({ ...r, license_no: e.target.value })} /></div>
          <div><Label>License expiry date</Label><Input type="date" value={r.license_expiry_date ?? ""} onChange={(e) => setR({ ...r, license_expiry_date: e.target.value })} /></div>
          <div><Label>Driving license image</Label><ImageUpload bucket="rider-docs" pathPrefix={`${r.id}/license`} value={r.license_image_url} onChange={(url) => setR({ ...r, license_image_url: url })} aspect="wide" /></div>
          <Button className="w-full" onClick={save}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
