import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function RiderJobs() {
  const { user } = useAuth();
  const [rider, setRider] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data: r } = await supabase.from("riders").select("*").eq("user_id", user.id).maybeSingle();
    setRider(r);
    if (!r || !r.is_active || r.status !== "online") {
      setJobs([]);
      return;
    }
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("merchant_id", r.merchant_id)
      .or(`and(rider_id.is.null,status.in.("accepted","preparing")),and(rider_id.eq.${r.id},status.eq.assigned)`)
      .order("created_at", { ascending: false });
    setJobs(data ?? []);
  };
  useEffect(() => { load(); }, [user?.id]);

  const licenseOk = rider?.license_image_url && (!rider?.license_expiry_date || new Date(rider.license_expiry_date) >= new Date());

  const accept = async (orderId: string) => {
    if (!rider) return;
    if (!licenseOk) { toast.error("Upload a valid driving license before accepting jobs."); return; }
    const { error } = await supabase.from("orders").update({ rider_id: rider.id, status: "rider_accepted" as any, assigned_at: new Date().toISOString() }).eq("id", orderId);
    if (error) toast.error(error.message); else { toast.success("Accepted"); load(); }
  };

  const fmt = (n: any) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n||0));

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Available jobs</h1>
      {rider && !licenseOk && (
        <Card className="border-destructive bg-destructive/10 p-3 text-sm">
          <p className="font-semibold text-destructive">License required</p>
          <p>{!rider.license_image_url ? "Your driving license has not been uploaded." : "Your driving license has expired."} Contact your merchant to update it.</p>
        </Card>
      )}
      {jobs.length === 0 && <p className="text-sm text-muted-foreground">No available jobs.</p>}
      {jobs.map((o) => (
        <Card key={o.id} className="space-y-2 p-4">
          <div className="flex justify-between"><span className="font-mono text-sm">{o.code}</span><span className="font-bold">{fmt(o.delivery_fee)}</span></div>
          <p className="text-sm">{o.address_snapshot?.address_line1}, {o.address_snapshot?.city}</p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1"><Link to={`/merchant/rider/jobs/${o.id}`}>Details</Link></Button>
            <Button size="sm" className="flex-1" onClick={() => accept(o.id)} disabled={!licenseOk}>Accept</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
