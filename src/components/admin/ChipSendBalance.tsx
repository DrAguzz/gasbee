import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, Wallet } from "lucide-react";

const fmt = (n: any) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n || 0));

/** Admin view of the CHIP Send balance and the Collect → Send budget allocation flow. */
export default function ChipSendBalance() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<string>("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [limits, setLimits] = useState<any[]>([]);
  const [amount, setAmount] = useState("");

  const load = async () => {
    setLoading(true); setError(null);
    const { data, error: fnErr } = await supabase.functions.invoke("chip-send-accounts", { body: {} });
    setLoading(false);
    if (fnErr) return setError(fnErr.message);
    if (!data?.ok) return setError(data?.error ?? "Could not load CHIP Send balance.");
    setMode(data.mode);
    setAccounts(data.accounts ?? []);
    setLimits(data.send_limits ?? []);
  };

  useEffect(() => { load(); }, []);

  const account = accounts[0];

  const convert = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a valid amount.");
    setBusy(true);
    const { data, error: fnErr } = await supabase.functions.invoke("chip-send-convert", { body: { amount: value } });
    setBusy(false);
    if (fnErr) return toast.error(fnErr.message);
    if (!data?.ok) return toast.error(data?.error ?? "Budget allocation failed.");
    toast.success(data.message);
    setAmount("");
    load();
  };

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">Send balance</p>
            <p className="text-xs text-muted-foreground">Convert Collect settlement balance into Send budget.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode && <Badge variant="secondary" className="capitalize">{mode}</Badge>}
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading balance…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {account && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Send balance</p>
              <p className="text-lg font-bold">{fmt(account.current_balance)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Convertible from Collect</p>
              <p className="text-lg font-bold">{fmt(account.convertible_balance_from_statement)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Send fee / transfer</p>
              <p className="text-lg font-bold">{fmt(account.send_fee ?? account.fee)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="w-48">
              <Label>Amount to convert (RM)</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
            </div>
            <Button onClick={convert} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Convert to Send budget
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Each request emails your CHIP approvers. It must be approved before 12 PM MYT the next day or it expires.
            Staging is limited to RM 1,000 per day.
          </p>
        </>
      )}

      {limits.length > 0 && (
        <div className="overflow-x-auto">
          <p className="mb-2 text-sm font-semibold">Budget allocation requests</p>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-2">Amount</th><th className="p-2">Status</th><th className="p-2">Approvals</th><th className="p-2">Requested</th></tr>
            </thead>
            <tbody>
              {limits.map((l: any) => (
                <tr key={l.id} className="border-t">
                  <td className="p-2">{fmt(l.amount)}</td>
                  <td className="p-2 capitalize">{l.status}</td>
                  <td className="p-2">{l.approvals_received ?? 0}/{l.approvals_required ?? "—"}</td>
                  <td className="p-2 text-xs">{l.created_at ? new Date(l.created_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
