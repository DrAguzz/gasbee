import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Plus, Trash2, Star, Crosshair, Pencil } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { MapPicker } from "@/components/MapPicker";
import { getMyLocation } from "@/lib/geolocation";

const MY_STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang",
  "Perak", "Perlis", "Pulau Pinang", "Sabah", "Sarawak", "Selangor",
  "Terengganu", "Kuala Lumpur", "Labuan", "Putrajaya",
];

const schema = z.object({
  label: z.string().trim().max(50).optional(),
  recipient_name: z.string().trim().max(100).optional(),
  recipient_phone: z.string().trim().max(20).optional(),
  address_line1: z.string().trim().min(1, "Required").max(200),
  address_line2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  postcode: z.string().trim().max(10).optional(),
});

export default function UserAddresses() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const empty: any = { id: null, address_line1: "", city: "", postcode: "", label: "Home", latitude: null, longitude: null };
  const [form, setForm] = useState<any>(empty);

  const load = () => {
    if (!user) return;
    supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).then(({ data }) => setItems(data ?? []));
  };
  useEffect(load, [user]);

  const useMyLocation = () => {
    getMyLocation({
      onSuccess: (latitude, longitude) =>
        setForm((f: any) => ({ ...f, latitude, longitude })),
    });
  };

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (a: any) => { setForm({ ...a }); setOpen(true); };

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    if (form.latitude == null || form.longitude == null) { toast.error("Pin your location on the map"); return; }
    const payload: any = { ...parsed.data, latitude: form.latitude, longitude: form.longitude };
    if (form.id) {
      const { error } = await supabase.from("addresses").update(payload).eq("id", form.id);
      if (error) return toast.error(error.message);
      toast.success("Address updated");
    } else {
      const isDefault = items.length === 0;
      const { error } = await supabase.from("addresses").insert({ ...payload, user_id: user!.id, is_default: isDefault });
      if (error) return toast.error(error.message);
      toast.success("Address added");
    }
    setOpen(false); setForm(empty); load();
  };

  const setDefault = async (id: string) => {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user!.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    load();
  };
  const del = async (id: string) => { if (!confirm("Delete address?")) return; await supabase.from("addresses").delete().eq("id", id); load(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Addresses</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Add</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Edit address" : "New address"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Label</Label><Input value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
              <div><Label>Recipient name</Label><Input value={form.recipient_name ?? ""} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} /></div>
              <div><Label>Recipient phone</Label><Input value={form.recipient_phone ?? ""} onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })} /></div>
              <div><Label>Address line 1 *</Label><Input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} /></div>
              <div><Label>Address line 2</Label><Input value={form.address_line2 ?? ""} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Postcode</Label><Input value={form.postcode ?? ""} onChange={(e) => setForm({ ...form, postcode: e.target.value })} /></div>
                <div><Label>City</Label><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div>
                  <Label>State</Label>
                  <Select value={form.state ?? ""} onValueChange={(v) => setForm({ ...form, state: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      {MY_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Pin location on map *</Label>
                  <Button type="button" size="sm" variant="outline" onClick={useMyLocation}><Crosshair className="mr-1 h-3 w-3" />Use my location</Button>
                </div>
                <MapPicker lat={form.latitude} lng={form.longitude} onChange={(la, ln) => setForm({ ...form, latitude: la, longitude: ln })} />
                {form.latitude != null && <p className="mt-1 text-[11px] text-muted-foreground">Pinned: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}</p>}
              </div>
              <Button className="w-full" onClick={save}>{form.id ? "Update" : "Save"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {items.map((a) => (
        <Card key={a.id} className="flex items-start gap-3 p-3">
          <MapPin className="mt-1 h-4 w-4 text-primary" />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold">{a.label ?? "Address"} {a.is_default && <span className="rounded bg-primary/10 px-2 text-xs text-primary">Default</span>}</div>
            <div className="text-xs text-muted-foreground">{a.address_line1}{a.address_line2 ? `, ${a.address_line2}` : ""}, {a.postcode} {a.city} {a.state}</div>
            {a.recipient_name && <div className="text-xs text-muted-foreground">{a.recipient_name} · {a.recipient_phone}</div>}
            {a.latitude && <div className="text-[10px] text-muted-foreground">📍 {Number(a.latitude).toFixed(4)}, {Number(a.longitude).toFixed(4)}</div>}
          </div>
          <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
          {!a.is_default && <Button size="icon" variant="ghost" onClick={() => setDefault(a.id)}><Star className="h-4 w-4" /></Button>}
          <Button size="icon" variant="ghost" onClick={() => del(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </Card>
      ))}
      {items.length === 0 && <p className="text-sm text-muted-foreground">No addresses yet.</p>}
    </div>
  );
}
