import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Loader2, RefreshCw, Trash2 } from "lucide-react";

export type PayoutOwner =
  | { owner_type: "merchant"; merchant_id: string }
  | { owner_type: "rider"; rider_id: string };

const statusVariant = (s?: string) =>
  s === "verified" ? "default" : s === "error" || s === "rejected" ? "destructive" : "secondary";

/**
 * Recipient bank account for CHIP Send payouts.
 * Saving stores the row locally, then registers it with CHIP to obtain a bank_account_id.
 */
export function PayoutBankAccountCard({ owner, title = "Payout bank account" }: { owner: PayoutOwner; title?: string }) {
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ account_name: "", account_number: "", bank_code: "", email: "" });

  const ownerFilter = (q: any) =>
    owner.owner_type === "merchant"
      ? q.eq("owner_type", "merchant").eq("merchant_id", owner.merchant_id)
      : q.eq("owner_type", "rider").eq("rider_id", owner.rider_id);

  const load = async () => {
    setLoading(true);
    const { data } = await ownerFilter(supabase.from("payout_bank_accounts").select("*")).limit(1).maybeSingle();
    setRow(data ?? null);
    if (data) {
      setForm({
        account_name: data.account_name ?? "",
        account_number: data.account_number ?? "",
        bank_code: data.bank_code ?? "",
        email: data.email ?? "",
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(owner)]);

  const save = async () => {
    if (!form.account_name.trim() || !form.account_number.trim() || !form.bank_code.trim()) {
      return toast.error("Account holder name, account number and bank code are required.");
    }
    setBusy(true);
    const payload: any = {
      ...owner,
      account_name: form.account_name.trim(),
      account_number: form.account_number.replace(/\s+/g, ""),
      bank_code: form.bank_code.trim().toUpperCase(),
      email: form.email.trim() || null,
      status: "pending",
      rejection_reason: null,
    };

    let id = row?.id;
    if (id) {
      // Changing the account details invalidates the CHIP registration.
      const changed =
        row.account_number !== payload.account_number ||
        row.bank_code !== payload.bank_code ||
        row.account_name !== payload.account_name;
      const { error } = await supabase
        .from("payout_bank_accounts")
        .update(changed ? { ...payload, chip_bank_account_id: null } : payload)
        .eq("id", id);
      if (error) { setBusy(false); return toast.error(error.message); }
    } else {
      const { data, error } = await supabase.from("payout_bank_accounts").insert(payload).select("id").single();
      if (error) { setBusy(false); return toast.error(error.message); }
      id = data.id;
    }

    const { data: res, error: fnErr } = await supabase.functions.invoke("chip-send-bank-account", {
      body: { action: "register", id },
    });
    setBusy(false);
    if (fnErr) return toast.error(fnErr.message);
    if (!res?.ok) { await load(); return toast.error(res?.error ?? "Registration with CHIP failed."); }
    toast.success(res.message);
    load();
  };

  const refresh = async () => {
    if (!row?.id) return;
    setBusy(true);
    const { data: res } = await supabase.functions.invoke("chip-send-bank-account", { body: { action: "register", id: row.id } });
    setBusy(false);
    if (!res?.ok) toast.error(res?.error ?? "Could not refresh status."); else toast.success(res.message);
    load();
  };

  const remove = async () => {
    if (!row?.id) return;
    setBusy(true);
    const { data: res } = await supabase.functions.invoke("chip-send-bank-account", { body: { action: "delete", id: row.id } });
    setBusy(false);
    if (!res?.ok) return toast.error(res?.error ?? "Could not remove account.");
    toast.success(res.message);
    setRow(null);
    setForm({ account_name: "", account_number: "", bank_code: "", email: "" });
  };

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">Used for CHIP Send payouts.</p>
          </div>
        </div>
        {row?.status && <Badge variant={statusVariant(row.status) as any} className="capitalize">{row.status}</Badge>}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Account holder name</Label>
            <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="As registered with the bank" />
          </div>
          <div>
            <Label>Account number</Label>
            <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} placeholder="1234567890" inputMode="numeric" />
          </div>
          <div>
            <Label>Bank code (SWIFT)</Label>
            <Input value={form.bank_code} onChange={(e) => setForm({ ...form, bank_code: e.target.value.toUpperCase() })} placeholder="MBBEMYKL" />
          </div>
          <div className="sm:col-span-2">
            <Label>Notification email (optional)</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="finance@example.com" type="email" />
          </div>
          {row?.rejection_reason && (
            <p className="sm:col-span-2 text-xs text-destructive">{row.rejection_reason}</p>
          )}
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button onClick={save} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {row ? "Save & re-register" : "Save & register with CHIP"}
            </Button>
            {row && (
              <>
                <Button variant="outline" onClick={refresh} disabled={busy}><RefreshCw className="mr-2 h-4 w-4" />Refresh status</Button>
                <Button variant="outline" onClick={remove} disabled={busy}><Trash2 className="mr-2 h-4 w-4" />Remove</Button>
              </>
            )}
          </div>
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            Bank code uses the SWIFT/BIC format, e.g. MBBEMYKL (Maybank), CIBBMYKL (CIMB), PBBEMYKL (Public Bank).
          </p>
        </div>
      )}
    </Card>
  );
}

export default PayoutBankAccountCard;
