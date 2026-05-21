import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DataListPage } from "@/components/admin/DataListPage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

function EditCategoryDialog({ row, onDone }: { row: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: row.name ?? "",
    slug: row.slug ?? "",
    icon: row.icon ?? "",
    sort_order: row.sort_order ?? 0,
    is_active: row.is_active ?? true,
  });
  const save = async () => {
    const { error } = await supabase.from("categories").update(form).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); onDone();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Pencil className="mr-1 h-3 w-3" />Edit</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit category</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
          <div><Label>Icon (emoji or url)</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🔥 or https://…" /></div>
          <div>
            <Label>Or upload image</Label>
            <ImageUpload bucket="category-icons" pathPrefix="icons" value={form.icon?.startsWith("http") ? form.icon : null} onChange={(url) => setForm({ ...form, icon: url ?? "" })} label="Upload icon" />
          </div>
          <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
          </label>
          <Button onClick={save} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Categories() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [reload, setReload] = useState(0);

  const create = async () => {
    if (!name.trim()) return toast.error("Name required");
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { error } = await supabase.from("categories").insert({ name, slug });
    if (error) return toast.error(error.message);
    toast.success("Category created"); setOpen(false); setName(""); setReload((k) => k + 1);
  };

  const remove = async (row: any) => {
    if (!confirm(`Delete category "${row.name}"?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); setReload((k) => k + 1);
  };

  return (
    <DataListPage
      key={reload}
      title="Categories" description="Product categories." table="categories" searchField="name"
      orderBy={{ column: "sort_order", ascending: true }}
      topAction={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>+ New category</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New category</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <Button onClick={create} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
      columns={[
        { key: "icon", label: "Icon", render: (r: any) => r.icon ? (r.icon.startsWith("http") ? <img src={r.icon} alt="" className="h-8 w-8 rounded object-cover" /> : <span className="text-lg">{r.icon}</span>) : "—" },
        { key: "name", label: "Name" },
        { key: "slug", label: "Slug" },
        { key: "sort_order", label: "Order" },
        { key: "is_active", label: "Active", render: (r: any) => r.is_active ? "Yes" : "No" },
      ]}
      rowAction={(r: any) => (
        <div className="flex justify-end gap-2">
          <EditCategoryDialog row={r} onDone={() => setReload((k) => k + 1)} />
          <Button size="sm" variant="outline" onClick={() => remove(r)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      )}
    />
  );
}
