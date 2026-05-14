import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Pencil, KeyRound, ShieldOff, ShieldCheck } from "lucide-react";

const ADMIN_ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "operation_admin", label: "Operation Admin" },
  { value: "finance_admin", label: "Finance Admin" },
  { value: "support_admin", label: "Support Admin" },
];

interface AdminRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function Admins() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [resetting, setResetting] = useState<AdminRow | null>(null);
  const [busy, setBusy] = useState(false);

  const [createForm, setCreateForm] = useState({
    email: "", password: "", full_name: "", phone: "", role: "admin",
  });
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", role: "admin" });
  const [newPassword, setNewPassword] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-admins", { body: { action: "list" } });
    if (error) toast({ title: "Failed to load admins", description: error.message, variant: "destructive" });
    setRows(data?.admins ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-admins", {
      body: { action: "create", ...createForm },
    });
    setBusy(false);
    if (error || data?.error) {
      toast({ title: "Failed", description: error?.message ?? data?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Admin created" });
    setOpenCreate(false);
    setCreateForm({ email: "", password: "", full_name: "", phone: "", role: "admin" });
    load();
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    const { error: e1 } = await supabase.functions.invoke("admin-manage-admins", {
      body: { action: "update_profile", user_id: editing.id, full_name: editForm.full_name, phone: editForm.phone },
    });
    let e2err: string | null = null;
    if (editForm.role !== editing.role) {
      const { data, error } = await supabase.functions.invoke("admin-manage-admins", {
        body: { action: "set_role", user_id: editing.id, role: editForm.role },
      });
      if (error || data?.error) e2err = error?.message ?? data?.error;
    }
    setBusy(false);
    if (e1 || e2err) {
      toast({ title: "Failed", description: e1?.message ?? e2err ?? "", variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });
    setEditing(null);
    load();
  };

  const resetPassword = async () => {
    if (!resetting) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-admins", {
      body: { action: "reset_password", user_id: resetting.id, password: newPassword },
    });
    setBusy(false);
    if (error || data?.error) {
      toast({ title: "Failed", description: error?.message ?? data?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated" });
    setResetting(null);
    setNewPassword("");
  };

  const toggleActive = async (row: AdminRow) => {
    const { data, error } = await supabase.functions.invoke("admin-manage-admins", {
      body: { action: "set_active", user_id: row.id, is_active: !row.is_active },
    });
    if (error || data?.error) {
      toast({ title: "Failed", description: error?.message ?? data?.error, variant: "destructive" });
      return;
    }
    toast({ title: row.is_active ? "Admin disabled" : "Admin enabled" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Users</h1>
          <p className="text-sm text-muted-foreground">Manage backend admin accounts and roles.</p>
        </div>
        <Button onClick={() => setOpenCreate(true)}><Plus className="mr-2 h-4 w-4" />New Admin</Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No admins yet.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3 font-medium">
                  {r.full_name ?? "—"}
                  {r.id === user?.id && <Badge variant="secondary" className="ml-2">You</Badge>}
                </td>
                <td className="px-4 py-3">{r.email}</td>
                <td className="px-4 py-3">{r.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">
                    {ADMIN_ROLE_OPTIONS.find((o) => o.value === r.role)?.label ?? r.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={r.is_active ? "default" : "destructive"}>
                    {r.is_active ? "Active" : "Disabled"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    setEditing(r);
                    setEditForm({ full_name: r.full_name ?? "", phone: r.phone ?? "", role: r.role });
                  }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setResetting(r); setNewPassword(""); }}>
                    <KeyRound className="h-3.5 w-3.5" />
                  </Button>
                  {r.id !== user?.id && (
                    <Button size="sm" variant="outline" onClick={() => toggleActive(r)}>
                      {r.is_active ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Create dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Admin</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full name</Label><Input value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} /></div>
            <div><Label>Password</Label><Input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADMIN_ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button onClick={create} disabled={busy}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Admin</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Email</Label><Input value={editing?.email ?? ""} disabled /></div>
            <div><Label>Full name</Label><Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADMIN_ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={busy}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetting} onOpenChange={(o) => !o && setResetting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset password — {resetting?.email}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>New password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetting(null)}>Cancel</Button>
            <Button onClick={resetPassword} disabled={busy || newPassword.length < 6}>Update password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
