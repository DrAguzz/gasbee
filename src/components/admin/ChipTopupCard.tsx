import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, ExternalLink, Link2, RefreshCw } from "lucide-react";

const fmt = (n: any) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n || 0));

const statusVariant = (s: string) =>
  s === "paid" ? "secondary" : s === "failed" ? "destructive" : "outline";

/** Generate a CHIP Collect payment link so finance can top up from the Maybank account. */
export function ChipTopupCard({ onChanged }: { onChanged?: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [due, setDue] = useState({ merchant: 0, rider: 0, total: 0 });

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: ms }, { data: rs }] = await Promise.all([
      supabase
        .from("fund_movements")
        .select("*")
        .not("chip_purchase_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("settlements").select("net_payout").neq("status", "paid"),
      supabase.from("rider_settlements").select("net_payout").neq("status", "paid"),
    ]);
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows(data ?? []);
    const merchant = (ms ?? []).reduce((a: number, s: any) => a + Number(s.net_payout || 0), 0);
    const rider = (rs ?? []).reduce((a: number, s: any) => a + Number(s.net_payout || 0), 0);
    const total = Math.round((merchant + rider) * 100) / 100;
    setDue({ merchant, rider, total });
    setAmount((prev) => (prev === "" && total > 0 ? total.toFixed(2) : prev));
  };

  useEffect(() => { load(); }, []);


  const generate = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a valid amount.");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("chip-topup-link", {
      body: { amount: value, reference },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!data?.ok) return toast.error(data?.error ?? "Could not create the payment link.");
    toast.success("Payment link created.");
    setAmount(""); setReference("");
    load();
    onChanged?.();
    if (data.url) window.open(data.url, "_blank", "noopener");
  };

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied.");
  };

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">Top up CHIP Collect</p>
            <p className="text-xs text-muted-foreground">
              Create a payment link and pay it from the Gasbee Maybank account to move funds back into CHIP Collect.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <Label>Amount (RM)</Label>
          <Input value={amount} inputMode="decimal" placeholder="0.00" onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label>Reference (optional)</Label>
          <Input value={reference} placeholder="e.g. Topup Aug 2026" onChange={(e) => setReference(e.target.value)} />
        </div>
        <Button onClick={generate} disabled={busy}>{busy ? "Creating…" : "Generate payment link"}</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Date</th><th className="p-2">Amount</th><th className="p-2">Reference</th>
              <th className="p-2">Status</th><th className="p-2">Payment link</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 text-xs">{r.moved_at}</td>
                <td className="p-2 font-semibold">{fmt(r.amount)}</td>
                <td className="p-2 text-xs">{r.reference ?? "—"}</td>
                <td className="p-2">
                  <Badge variant={statusVariant(r.status) as any} className="capitalize">{r.status}</Badge>
                </td>
                <td className="p-2">
                  {r.checkout_url ? (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" aria-label="Copy link" onClick={() => copy(r.checkout_url)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Open link" asChild>
                        <a href={r.checkout_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                    </div>
                  ) : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">
                {loading ? "Loading…" : "No payment links yet."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default ChipTopupCard;
