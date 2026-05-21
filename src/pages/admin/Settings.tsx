import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const KEYS = [
  { key: "platform_name", label: "Platform name", default: "Gasbee" },
  { key: "support_email", label: "Support email", default: "support@gasbee.com.my" },
  { key: "default_commission_pct", label: "Default commission (%)", default: "10" },
  { key: "service_fee", label: "Service fee (MYR)", default: "5" },
  { key: "delivery_base_fee", label: "Delivery base fee (MYR)", default: "5" },
  { key: "delivery_base_km", label: "Delivery base distance (km)", default: "5" },
  { key: "delivery_per_km", label: "Delivery per additional km (MYR)", default: "1" },
  { key: "processing_fee", label: "Processing fee (MYR)", default: "1.50" },
];

export default function Settings() {
  const [vals, setVals] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("*");
      const m: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { m[r.key] = typeof r.value === "string" ? r.value : JSON.stringify(r.value); });
      KEYS.forEach((k) => { if (!(k.key in m)) m[k.key] = k.default; });
      setVals(m);
    })();
  }, []);
  const save = async () => {
    const rows = Object.entries(vals).map(([key, value]) => ({ key, value: value as any }));
    const { error } = await supabase.from("app_settings").upsert(rows);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-sm text-muted-foreground">System-wide configuration.</p></div>
      <Card className="p-6 space-y-4 max-w-2xl">
        {KEYS.map((k) => (
          <div key={k.key}>
            <Label>{k.label}</Label>
            <Input value={vals[k.key] ?? ""} onChange={(e)=>setVals({ ...vals, [k.key]: e.target.value })} />
          </div>
        ))}
        <Button onClick={save}>Save settings</Button>
      </Card>
    </div>
  );
}
