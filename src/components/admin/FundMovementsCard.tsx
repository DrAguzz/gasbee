import { useEffect, useImperativeHandle, useState, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ImageUpload";
import { SignedLink } from "@/components/SignedImage";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Landmark, Trash2 } from "lucide-react";

const fmt = (n: any) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n || 0));

const DIRECTIONS = [
  { value: "collect_to_bank", label: "CHIP → Gasbee Maybank" },
  { value: "bank_to_chip", label: "Gasbee Maybank → CHIP" },
] as const;

const emptyForm = {
  direction: "collect_to_bank",
  amount: "",
  moved_at: new Date().toISOString().slice(0, 10),
  reference: "",
  notes: "",
  proof_url: null as string | null,
};

export type FundMovementsHandle = { reload: () => void };

/** Manual audit trail for money moving between CHIP and the Gasbee Maybank account. */
export const FundMovementsCard = forwardRef<FundMovementsHandle>((_props, ref) => {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const load = async () => {
    const { data, error } = await supabase
      .from("fund_movements")
      .select("*")
      .order("moved_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return toast.error(error.message);
    setRows(data ?? []);
  };

  useEffect(() => { load(); }, []);
  useImperativeHandle(ref, () => ({ reload: load }));

  const counted = rows.filter((r) => ["recorded", "paid"].includes(String(r.status ?? "recorded")));
  const totalOut = counted.filter((r) => r.direction === "collect_to_bank").reduce((a, r) => a + Number(r.amount || 0), 0);
  const totalIn = counted.filter((r) => r.direction === "bank_to_chip").reduce((a, r) => a + Number(r.amount || 0), 0);

  const save = async () => {
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid amount.");
    if (!form.moved_at) return toast.error("A date is required.");
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("fund_movements").insert({
      direction: form.direction,
      amount,
      moved_at: form.moved_at,
      reference: form.reference.trim() || null,
      notes: form.notes.trim() || null,
      proof_url: form.proof_url,
      created_by: auth.user?.id ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Fund movement recorded.");
    setForm({ ...emptyForm });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("fund_movements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Record deleted.");
    load();
  };

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">Fund movements (Maybank)</p>
            <p className="text-xs text-muted-foreground">
              Audit trail: money settled from CHIP to the Gasbee bank account, and topped back up into CHIP.
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm">+ Record movement</Button></DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record fund movement</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Movement type</Label>
                <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIRECTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Amount (RM)</Label>
                  <Input value={form.amount} inputMode="decimal" placeholder="0.00"
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.moved_at} onChange={(e) => setForm({ ...form, moved_at: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Reference number</Label>
                <Input value={form.reference} placeholder="e.g. TRX123456"
                  onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} rows={2} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <ImageUpload
                bucket="finance-docs"
                pathPrefix="fund-movements"
                label="Slip / statement (optional)"
                value={form.proof_url}
                onChange={(url) => setForm({ ...form, proof_url: url })}
              />
              <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save record"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Out to Maybank</p>
          <p className="text-lg font-bold">{fmt(totalOut)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Topped up to CHIP</p>
          <p className="text-lg font-bold">{fmt(totalIn)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Still at Maybank</p>
          <p className="text-lg font-bold">{fmt(totalOut - totalIn)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Amount</th>
              <th className="p-2">Status</th><th className="p-2">Reference</th><th className="p-2">Notes</th>
              <th className="p-2">Slip</th><th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 text-xs">{r.moved_at}</td>
                <td className="p-2">
                  <Badge variant="secondary" className="gap-1">
                    {r.direction === "collect_to_bank"
                      ? <><ArrowUpRight className="h-3 w-3" />CHIP → Maybank</>
                      : <><ArrowDownLeft className="h-3 w-3" />Maybank → CHIP</>}
                  </Badge>
                </td>
                <td className="p-2 font-semibold">{fmt(r.amount)}</td>
                <td className="p-2">
                  <Badge
                    variant={r.status === "failed" ? "destructive" : r.status === "pending" ? "outline" : "secondary"}
                    className="capitalize"
                  >
                    {r.status ?? "recorded"}
                  </Badge>
                </td>
                <td className="p-2 text-xs">{r.reference ?? "—"}</td>
                <td className="p-2 text-xs text-muted-foreground">{r.notes ?? "—"}</td>
                <td className="p-2 text-xs">
                  {r.proof_url
                    ? <SignedLink url={r.proof_url} bucket="finance-docs" target="_blank" rel="noreferrer" className="text-primary underline">View</SignedLink>
                    : "—"}
                </td>
                <td className="p-2 text-right">
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)} aria-label="Delete record">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No fund movements recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
});
FundMovementsCard.displayName = "FundMovementsCard";

export default FundMovementsCard;
