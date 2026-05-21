import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DataListPage } from "@/components/admin/DataListPage";
import { StatusBadge } from "@/components/admin/StatusBadge";

export default function Orders() {
  const nav = useNavigate();
  const fmt = (n: any) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n||0));
  return (
    <DataListPage
      title="Orders" description="All customer orders across merchants."
      table="orders" searchField="code"
      selectQuery="*, merchants(name)"
      orderBy={{ column: "created_at", ascending: false }}
      columns={[
        { key: "code", label: "Code", render: (r: any) => <span className="font-mono">{r.code}</span> },
        { key: "merchant", label: "Merchant", render: (r: any) => r.merchants?.name ?? "—" },
        { key: "status", label: "Status", render: (r: any) => <StatusBadge value={r.status} /> },
        { key: "payment_status", label: "Payment", render: (r: any) => <StatusBadge value={r.payment_status} /> },
        { key: "total_amount", label: "Total", render: (r: any) => fmt(r.total_amount) },
        { key: "delivery_type", label: "Delivery" },
        { key: "created_at", label: "Created", render: (r: any) => new Date(r.created_at).toLocaleString() },
      ]}
      rowAction={(r: any) => <Button size="sm" variant="outline" onClick={()=>nav(`/orders/${r.id}`)}>View</Button>}
    />
  );
}
