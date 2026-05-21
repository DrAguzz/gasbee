import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchantContext } from "@/hooks/useMerchantContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { MapPicker } from "@/components/MapPicker";
import { Crosshair } from "lucide-react";
import { toast } from "sonner";
import { getMyLocation } from "@/lib/geolocation";

export default function MerchantProfile() {
  const { merchant, refresh } = useMerchantContext();
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (merchant) setForm(merchant); }, [merchant]);

  if (!form) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const useMyLocation = () => {
    getMyLocation({
      onSuccess: (latitude, longitude) =>
        setForm({ ...form, latitude, longitude }),
    });
  };

  const save = async () => {
    const radius = Number(form.delivery_radius_km);
    if (!Number.isFinite(radius) || radius <= 0) { toast.error("Delivery radius must be greater than 0 km"); return; }
    const { error } = await supabase.from("merchants").update({
      name: form.name, description: form.description, phone: form.phone, email: form.email,
      address: form.address, city: form.city, state: form.state, postcode: form.postcode, logo_url: form.logo_url,
      latitude: form.latitude, longitude: form.longitude,
      delivery_radius_km: radius,
    }).eq("id", form.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); refresh(); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Merchant profile</h1>
      <Card className="space-y-4 p-6">
        <div>
          <Label>Logo</Label>
          <ImageUpload bucket="merchant-logos" pathPrefix={form.id} value={form.logo_url} onChange={(url) => setForm({ ...form, logo_url: url })} label="Upload logo" />
        </div>
        <div><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={150} /></div>
        <div><Label>Description</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        </div>
        <div><Label>Address</Label><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Postcode</Label><Input value={form.postcode ?? ""} onChange={(e) => setForm({ ...form, postcode: e.target.value })} /></div>
          <div><Label>City</Label><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><Label>State</Label><Input value={form.state ?? ""} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>Pickup location (used for delivery fee distance)</Label>
            <Button type="button" size="sm" variant="outline" onClick={useMyLocation}><Crosshair className="mr-1 h-3 w-3" />Use current</Button>
          </div>
          <MapPicker lat={form.latitude} lng={form.longitude} onChange={(la, ln) => setForm({ ...form, latitude: la, longitude: ln })} height={300} radiusKm={Number(form.delivery_radius_km) || 10} />
          {form.latitude != null && <p className="mt-1 text-[11px] text-muted-foreground">Pinned: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}</p>}
        </div>
        <div>
          <Label>Delivery radius (km)</Label>
          <Input
            type="number"
            min={1}
            step={0.5}
            value={form.delivery_radius_km ?? 10}
            onChange={(e) => setForm({ ...form, delivery_radius_km: e.target.value })}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Customers outside this distance from your pickup location won't be able to order from your shop.
          </p>
        </div>
        <Button onClick={save}>Save</Button>
      </Card>
    </div>
  );
}
