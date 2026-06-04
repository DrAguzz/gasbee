import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { SignedImage } from "@/components/SignedImage";

export default function RiderProfile() {
  const { user } = useAuth();
  const [r, setR] = useState<any>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("riders").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => setR(data));
  }, [user?.id]);

  if (!r) return <p className="text-sm text-muted-foreground">No rider profile.</p>;
  const expired = r.license_expiry_date && new Date(r.license_expiry_date) < new Date();
  const Row = ({ label, value }: any) => (
    <div className="flex justify-between border-b py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">My profile</h1>
      <p className="text-xs text-muted-foreground">Profile is managed by your merchant. Contact them for any updates.</p>
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-3">
          {r.profile_image_url
            ? <SignedImage url={r.profile_image_url} bucket="rider-docs" className="h-16 w-16 rounded-full object-cover" />
            : <div className="h-16 w-16 rounded-full bg-muted" />}
          <div>
            <p className="font-bold">{r.full_name}</p>
            <p className="text-xs text-muted-foreground">★ {Number(r.rating || 0).toFixed(1)} · {r.total_deliveries} deliveries</p>
          </div>
        </div>
        <Row label="Phone" value={r.phone} />
        <Row label="Vehicle" value={`${r.vehicle_type ?? "—"} ${r.vehicle_plate ?? ""}`} />
        <Row label="License no" value={r.license_no} />
        <Row label="License expiry" value={r.license_expiry_date ? new Date(r.license_expiry_date).toLocaleDateString() : "—"} />
      </Card>

      {(!r.license_image_url || expired) && (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="font-semibold text-destructive">⚠ Action required</p>
          <p className="mt-1 text-sm">{!r.license_image_url ? "You haven't uploaded your driving license yet." : "Your license has expired."} Please contact your merchant to update it before accepting jobs.</p>
        </Card>
      )}

      {r.license_image_url && (
        <Card className="p-4">
          <p className="mb-2 text-sm font-semibold">Driving license</p>
          <SignedImage url={r.license_image_url} bucket="rider-docs" className="w-full rounded-md border" />
        </Card>
      )}
    </div>
  );
}
