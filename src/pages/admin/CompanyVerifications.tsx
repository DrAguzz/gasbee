import { supabase } from "@/integrations/supabase/client";
import { DataListPage } from "@/components/admin/DataListPage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { SignedLink } from "@/components/SignedImage";

function ReviewDialog({ row, onDone }: { row: any; onDone: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(row.review_notes ?? "");
  const decide = async (status: "approved" | "rejected") => {
    const { error } = await supabase.from("company_verifications").update({
      status, review_notes: notes.trim().slice(0, 500), reviewed_by: user!.id, reviewed_at: new Date().toISOString(),
    }).eq("id", row.id);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: row.user_id, type: "system" as any,
      title: status === "approved" ? "Company account approved" : "Company account rejected",
      body: status === "approved" ? "You can now purchase industrial gas." : (notes || "Please review your application."),
      link: "/user/company-verification",
    });
    toast.success("Updated"); setOpen(false); onDone();
  };
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Review</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{row.company_name}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">SSM:</span> {row.ssm_number}</div>
            <div><span className="text-muted-foreground">Telefon:</span> {row.contact_phone || "—"}</div>
            <div><span className="text-muted-foreground">Alamat:</span> {row.business_address || "—"}</div>
            <div className="flex gap-3 pt-2">
              {row.ssm_doc_url && <SignedLink url={row.ssm_doc_url} bucket="company-docs" target="_blank" rel="noreferrer" className="text-primary underline">SSM doc</SignedLink>}
              {row.additional_doc_url && <SignedLink url={row.additional_doc_url} bucket="company-docs" target="_blank" rel="noreferrer" className="text-primary underline">Additional doc</SignedLink>}
            </div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan review (optional)" maxLength={500} />
            <div className="flex gap-2">
              <Button onClick={() => decide("approved")} className="flex-1">Approve</Button>
              <Button variant="destructive" onClick={() => decide("rejected")} className="flex-1">Reject</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function CompanyVerifications() {
  return (
    <DataListPage
      title="Company Verifications" description="Review SSM documents to approve industrial-gas buyers."
      table="company_verifications" searchField="company_name"
      orderBy={{ column: "created_at", ascending: false }}
      columns={[
        { key: "company_name", label: "Company" },
        { key: "ssm_number", label: "SSM" },
        { key: "contact_phone", label: "Phone" },
        { key: "status", label: "Status", render: (r: any) => <StatusBadge value={r.status} /> },
        { key: "created_at", label: "Submitted", render: (r: any) => new Date(r.created_at).toLocaleString() },
      ]}
      rowAction={(r: any) => <ReviewDialog row={r} onDone={() => setTimeout(() => location.reload(), 200)} />}
    />
  );
}
