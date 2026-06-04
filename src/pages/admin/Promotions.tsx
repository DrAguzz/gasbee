import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

type Promo = {
  id: string;
  code: string;
  description: string | null;
  type: "percent" | "flat";
  value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  applies_to: "all" | "merchant";
  merchant_id: string | null;
};

const emptyForm = {
  id: "",
  code: "",
  description: "",
  type: "percent" as "percent" | "flat",
  value: "10",
  min_order_amount: "0",
  max_discount: "",
  usage_limit: "",
  is_active: true,
  starts_at: "",
  ends_at: "",
  applies_to: "all" as "all" | "merchant",
  merchant_id: "",
};

export default function Promotions() {
  const [rows, setRows] = useState<Promo[]>([]);
  const [merchants, setMerchants] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const editing = !!form.id;

  const load = async () => {
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from("promotions").select("*").order("created_at", { ascending: false }),
      supabase.from("merchants").select("id,name").order("name"),
    ]);
    setRows((p ?? []) as any);
    setMerchants((m ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => setForm(emptyForm);
  const openNew = () => { resetForm(); setOpen(true); };
  const openEdit = (r: Promo) => {
    setForm({
      id: r.id,
      code: r.code,
      description: r.description ?? "",
      type: r.type,
      value: String(r.value),
      min_order_amount: String(r.min_order_amount ?? 0),
      max_discount: r.max_discount != null ? String(r.max_discount) : "",
      usage_limit: r.usage_limit != null ? String(r.usage_limit) : "",
      is_active: r.is_active,
      starts_at: r.starts_at ? r.starts_at.slice(0, 16) : "",
      ends_at: r.ends_at ? r.ends_at.slice(0, 16) : "",
      applies_to: (r.applies_to ?? "all") as any,
      merchant_id: r.merchant_id ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.code.trim()) return toast.error("Code required");
    if (!Number(form.value)) return toast.error("Value required");
    if (form.applies_to === "merchant" && !form.merchant_id) return toast.error("Select a merchant");
    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description || null,
      type: form.type,
      value: Number(form.value),
      min_order_amount: Number(form.min_order_amount) || 0,
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      is_active: form.is_active,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      applies_to: form.applies_to,
      merchant_id: form.applies_to === "merchant" ? form.merchant_id : null,
    };
    const { error } = editing
      ? await supabase.from("promotions").update(payload).eq("id", form.id)
      : await supabase.from("promotions").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Coupon updated" : "Coupon created");
    setOpen(false);
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Coupon deleted");
    load();
  };

  const toggleActive = async (r: Promo) => {
    const { error } = await supabase.from("promotions").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const merchantName = (id: string | null) => id ? merchants.find((m) => m.id === id)?.name ?? "—" : "All merchants";
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : "—";
  const statusBadge = (r: Promo) => {
    const now = new Date();
    if (!r.is_active) return <Badge variant="secondary">Inactive</Badge>;
    if (r.starts_at && new Date(r.starts_at) > now) return <Badge variant="outline">Scheduled</Badge>;
    if (r.ends_at && new Date(r.ends_at) < now) return <Badge variant="destructive">Expired</Badge>;
    if (r.usage_limit != null && r.used_count >= r.usage_limit) return <Badge variant="destructive">Limit reached</Badge>;
    return <Badge>Active</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Coupon Codes</h1>
          <p className="text-sm text-muted-foreground">Manage discount codes, validity period, and scope.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={openNew}>+ New Coupon</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit coupon" : "New coupon"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Code *</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE10" />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label>Active</Label>
                    <div className="flex h-10 items-center"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
                  </div>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Customer-facing description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Discount type *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                      <SelectItem value="flat">Flat (RM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value *</Label>
                  <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Min order (RM)</Label>
                  <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} />
                </div>
                <div>
                  <Label>Max discount (RM)</Label>
                  <Input type="number" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} placeholder="Optional cap" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Starts at</Label>
                  <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                </div>
                <div>
                  <Label>Ends at</Label>
                  <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Usage limit (total)</Label>
                <Input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} placeholder="Empty = unlimited" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Applies to</Label>
                  <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All merchants</SelectItem>
                      <SelectItem value="merchant">Specific merchant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.applies_to === "merchant" && (
                  <div>
                    <Label>Merchant</Label>
                    <Select value={form.merchant_id} onValueChange={(v) => setForm({ ...form, merchant_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Choose merchant" /></SelectTrigger>
                      <SelectContent>
                        {merchants.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button onClick={save} className="w-full">{editing ? "Save changes" : "Create coupon"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No coupons yet</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-mono font-semibold">{r.code}</div>
                  {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                </TableCell>
                <TableCell>
                  {r.type === "percent" ? `${r.value}%` : `RM ${Number(r.value).toFixed(2)}`}
                  {r.min_order_amount > 0 && <div className="text-xs text-muted-foreground">Min RM {r.min_order_amount}</div>}
                  {r.max_discount && <div className="text-xs text-muted-foreground">Max RM {r.max_discount}</div>}
                </TableCell>
                <TableCell className="text-sm">{r.applies_to === "merchant" ? merchantName(r.merchant_id) : "All merchants"}</TableCell>
                <TableCell className="text-xs">{fmtDate(r.starts_at)} → {fmtDate(r.ends_at)}</TableCell>
                <TableCell className="text-sm">{r.used_count}{r.usage_limit != null ? ` / ${r.usage_limit}` : ""}</TableCell>
                <TableCell>
                  <button onClick={() => toggleActive(r)}>{statusBadge(r)}</button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete coupon {r.code}?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(r.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
