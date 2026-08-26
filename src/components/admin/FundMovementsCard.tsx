import { useEffect, useState } from "react";
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
  { value: "collect_to_bank", label: "CHIP → Maybank Gasbee" },
  { value: "bank_to_chip", label: "Maybank Gasbee → CHIP" },
] as const;

const emptyForm = {
  direction: "collect_to_bank",
  amount: "",
  moved_at: new Date().toISOString().slice(0, 10),
  reference: "",
  notes: "",
  proof_url: null as string | null,
};

/** Manual audit trail for money moving between CHIP and the Gasbee Maybank account. */
export function FundMovementsCard() {
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

  const totalOut = rows.filter((r) => r.direction === "collect_to_bank").reduce((a, r) => a + Number(r.amount || 0), 0);
  const totalIn = rows.filter((r) => r.direction === "bank_to_chip").reduce((a, r) => a + Number(r.amount || 0), 0);

  const save = async () => {
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Masukkan amaun yang sah.");
    if (!form.moved_at) return toast.error("Tarikh diperlukan.");
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
    toast.success("Rekod pergerakan dana disimpan.");
    setForm({ ...emptyForm });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("fund_movements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Rekod dipadam.");
    load();
  };

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">Pergerakan dana (Maybank)</p>
            <p className="text-xs text-muted-foreground">
              Rekod manual untuk jejak audit: duit keluar dari CHIP ke bank Gasbee, dan topup semula ke CHIP.
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm">+ Rekod pergerakan</Button></DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Rekod pergerakan dana</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Jenis pergerakan</Label>
                <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIRECTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Amaun (RM)</Label>
                  <Input value={form.amount} inputMode="decimal" placeholder="0.00"
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Tarikh</Label>
                  <Input type="date" value={form.moved_at} onChange={(e) => setForm({ ...form, moved_at: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Nombor rujukan</Label>
                <Input value={form.reference} placeholder="Cth: TRX123456"
                  onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </div>
              <div>
                <Label>Nota</Label>
                <Textarea value={form.notes} rows={2} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <ImageUpload
                bucket="finance-docs"
                pathPrefix="fund-movements"
                label="Slip / penyata (opsyenal)"
                value={form.proof_url}
                onChange={(url) => setForm({ ...form, proof_url: url })}
              />
              <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Menyimpan…" : "Simpan rekod"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Keluar ke Maybank</p>
          <p className="text-lg font-bold">{fmt(totalOut)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Topup semula ke CHIP</p>
          <p className="text-lg font-bold">{fmt(totalIn)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Masih di Maybank</p>
          <p className="text-lg font-bold">{fmt(totalOut - totalIn)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Tarikh</th><th className="p-2">Jenis</th><th className="p-2">Amaun</th>
              <th className="p-2">Rujukan</th><th className="p-2">Nota</th><th className="p-2">Slip</th><th className="p-2"></th>
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
                <td className="p-2 text-xs">{r.reference ?? "—"}</td>
                <td className="p-2 text-xs text-muted-foreground">{r.notes ?? "—"}</td>
                <td className="p-2 text-xs">
                  {r.proof_url
                    ? <SignedLink url={r.proof_url} bucket="finance-docs" target="_blank" rel="noreferrer" className="text-primary underline">Lihat</SignedLink>
                    : "—"}
                </td>
                <td className="p-2 text-right">
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)} aria-label="Padam rekod">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Tiada rekod pergerakan dana lagi.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default FundMovementsCard;
