import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Eye, ShieldCheck, X } from "lucide-react";

type Row = any;

export default function AccountDeletionRequests() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState<Row | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    let query = supabase
      .from("account_deletion_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (statusFilter !== "all") query = query.eq("status", statusFilter as any);
    const { data } = await query;
    let list = data ?? [];
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((r: any) =>
        (r.name ?? "").toLowerCase().includes(s) ||
        (r.contact ?? "").toLowerCase().includes(s) ||
        (r.account_email ?? "").toLowerCase().includes(s)
      );
    }
    setRows(list);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    setBusy(true);
    const { error } = await supabase
      .from("account_deletion_requests")
      .update({
        status: status as any,
        admin_notes: notes || open?.admin_notes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Marked as ${status.replace("_", " ")}`);
    setOpen(null);
    setNotes("");
    load();
  };

  const deleteNow = async (id: string) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { request_id: id },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error(error?.message ?? (data as any)?.error ?? "Failed");
      return;
    }
    toast.success("Account deleted");
    setOpen(null);
    load();
  };

  const statuses = ["all", "pending", "in_review", "approved", "completed", "rejected"];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Account Deletion Requests</h1>
        <p className="text-sm text-muted-foreground">Review, approve, and process user deletion requests.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search name / email / phone…" value={q} onChange={(e) => setQ(e.target.value)} className="w-72" />
        <div className="flex flex-wrap gap-1">
          {statuses.map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
              {s.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="p-3">Name</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Account</th>
              <th className="p-3">Status</th>
              <th className="p-3">Requested</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3">{r.contact}</td>
                <td className="p-3 text-xs text-muted-foreground">{r.account_email ?? "—"}</td>
                <td className="p-3"><StatusBadge value={r.status} /></td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => { setOpen(r); setNotes(r.admin_notes ?? ""); }}>
                    <Eye className="mr-1 h-3.5 w-3.5" /> Review
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No requests.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!open} onOpenChange={(v) => { if (!v) setOpen(null); }}>
        <DialogContent className="max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>Deletion request</DialogTitle>
                <DialogDescription>
                  Follow the flow: <b>pending → in review → approved → completed</b>. Only "Delete Account Now" actually removes the user.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Name</Label><div>{open.name}</div></div>
                  <div><Label className="text-xs">Status</Label><div><StatusBadge value={open.status} /></div></div>
                  <div><Label className="text-xs">Contact</Label><div>{open.contact}</div></div>
                  <div><Label className="text-xs">Account email</Label><div className="truncate">{open.account_email ?? "—"}</div></div>
                  <div className="col-span-2"><Label className="text-xs">User ID</Label><div className="font-mono text-xs break-all">{open.user_id}</div></div>
                </div>
                <div>
                  <Label className="text-xs">User reason</Label>
                  <div className="rounded-md bg-muted/40 p-2 text-xs whitespace-pre-wrap">{open.reason || "(not provided)"}</div>
                </div>
                <div>
                  <Label className="text-xs">Admin notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes…" className="min-h-[70px]" />
                </div>
              </div>

              <DialogFooter className="flex flex-wrap gap-2">
                {open.status === "pending" && (
                  <Button variant="outline" disabled={busy} onClick={() => updateStatus(open.id, "in_review")}>
                    Start Review
                  </Button>
                )}
                {(open.status === "pending" || open.status === "in_review") && (
                  <>
                    <Button variant="outline" disabled={busy} onClick={() => updateStatus(open.id, "rejected")}>
                      <X className="mr-1 h-4 w-4" />Reject
                    </Button>
                    <Button disabled={busy} onClick={() => updateStatus(open.id, "approved")}>
                      <ShieldCheck className="mr-1 h-4 w-4" />Approve
                    </Button>
                  </>
                )}
                {open.status === "approved" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={busy}>
                        <Trash2 className="mr-1 h-4 w-4" />Delete Account Now
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Permanently delete this account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the user from authentication and clear their profile &amp; roles.
                          Order, payment, tax, and fraud records will be retained per policy. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteNow(open.id)} className="bg-destructive hover:bg-destructive/90">
                          Yes, delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
