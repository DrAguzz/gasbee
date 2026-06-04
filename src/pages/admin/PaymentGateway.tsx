import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";

type ChipConfig = {
  brand_id: string;
  api_key: string;
  success_redirect: string;
  failure_redirect: string;
};

export default function PaymentGateway() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<"sandbox" | "live">("sandbox");
  const [config, setConfig] = useState<ChipConfig>({
    brand_id: "",
    api_key: "",
    success_redirect: "",
    failure_redirect: "",
  });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("payment_gateways")
        .select("*")
        .eq("provider", "chip")
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setEnabled(!!data.enabled);
        setMode((data.mode as any) === "live" ? "live" : "sandbox");
        setConfig({
          brand_id: (data.config as any)?.brand_id ?? "",
          api_key: (data.config as any)?.api_key ?? "",
          success_redirect: (data.config as any)?.success_redirect ?? "",
          failure_redirect: (data.config as any)?.failure_redirect ?? "",
        });
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("payment_gateways")
      .upsert(
        {
          provider: "chip",
          enabled,
          mode,
          config: config as any,
          updated_by: user?.id ?? null,
        },
        { onConflict: "provider" },
      );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Payment gateway saved");
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const { data, error } = await supabase.functions.invoke("chip-test-connection", {
      body: { mode, api_key: config.api_key, brand_id: config.brand_id },
    });
    setTesting(false);
    if (error) {
      setTestResult({ ok: false, msg: error.message });
      return;
    }
    if (data?.ok) {
      setTestResult({ ok: true, msg: data.message || "Connection successful" });
    } else {
      setTestResult({ ok: false, msg: data?.error || "Connection failed" });
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Gateway</h1>
        <p className="text-sm text-muted-foreground">Configure payment providers used at checkout.</p>
      </div>

      <Card className="p-6 space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><CreditCard className="h-5 w-5 text-primary" /></div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Chip-in (CHIP)</h2>
                <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Active" : "Inactive"}</Badge>
                <Badge variant="outline">{mode === "live" ? "Live" : "Sandbox"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Malaysian payment gateway — FPX (Online Transfer), Credit Cards, e-wallets.</p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Environment</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (test)</SelectItem>
                <SelectItem value="live">Live (production)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Brand ID</Label>
            <Input
              value={config.brand_id}
              onChange={(e) => setConfig({ ...config, brand_id: e.target.value })}
              placeholder="e.g. 02xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>
        </div>

        <div>
          <Label>Secret API Key</Label>
          <div className="flex gap-2">
            <Input
              type={showKey ? "text" : "password"}
              value={config.api_key}
              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              placeholder="CHIP secret API key"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => setShowKey((s) => !s)}>
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Find it in your CHIP dashboard → Developers → API Keys. Stored encrypted; admin-only.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Success redirect URL (optional)</Label>
            <Input
              value={config.success_redirect}
              onChange={(e) => setConfig({ ...config, success_redirect: e.target.value })}
              placeholder="https://yourapp.com/payment/success"
            />
          </div>
          <div>
            <Label>Failure redirect URL (optional)</Label>
            <Input
              value={config.failure_redirect}
              onChange={(e) => setConfig({ ...config, failure_redirect: e.target.value })}
              placeholder="https://yourapp.com/payment/failed"
            />
          </div>
        </div>

        <div className="rounded-md border bg-muted/40 p-3 text-xs">
          <div className="font-semibold mb-1">Webhook URL</div>
          <code className="break-all">
            {import.meta.env.VITE_SUPABASE_URL}/functions/v1/chip-webhook
          </code>
          <p className="mt-1 text-muted-foreground">Add this as the success callback in your CHIP brand settings.</p>
        </div>

        {testResult && (
          <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${testResult.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
            {testResult.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <XCircle className="h-4 w-4 mt-0.5" />}
            <span className="break-all">{testResult.msg}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save settings
          </Button>
          <Button variant="outline" onClick={testConnection} disabled={testing || !config.api_key}>
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test connection
          </Button>
        </div>
      </Card>
    </div>
  );
}
