import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { FileDown, FileSpreadsheet } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(n);

const startOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);

export default function Reports() {
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());
  const [paid, setPaid] = useState<any[]>([]);
  const [refunded, setRefunded] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const start = from + "T00:00:00";
    const end = to + "T23:59:59";
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("orders").select("code,total_amount,created_at,merchant_id,payment_method").eq("payment_status", "paid").gte("created_at", start).lte("created_at", end),
      supabase.from("orders").select("code,total_amount,created_at,merchant_id").eq("payment_status", "refunded").gte("created_at", start).lte("created_at", end),
    ]);
    setPaid(p ?? []); setRefunded(r ?? []); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => {
    const revenue = paid.reduce((a, r) => a + Number(r.total_amount || 0), 0);
    const ref = refunded.reduce((a, r) => a + Number(r.total_amount || 0), 0);
    return { revenue, orders: paid.length, avg: paid.length ? revenue / paid.length : 0, refunded: ref };
  }, [paid, refunded]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Gasbee Sales Report", 14, 16);
    doc.setFontSize(10); doc.text(`Period: ${from} → ${to}`, 14, 23);
    autoTable(doc, {
      startY: 30,
      head: [["Metric", "Value"]],
      body: [
        ["Total Revenue", fmt(stats.revenue)],
        ["Paid Orders", String(stats.orders)],
        ["Avg Order Value", fmt(stats.avg)],
        ["Refunded", fmt(stats.refunded)],
      ],
    });
    autoTable(doc, {
      head: [["Order", "Date", "Method", "Amount"]],
      body: paid.map((r) => [r.code, new Date(r.created_at).toLocaleDateString(), r.payment_method === "fpx" ? "FPX (Online Transfer)" : (r.payment_method === "card" ? "Credit Card" : (r.payment_method === "cod" ? "COD (Cash on Delivery)" : (r.payment_method ?? "—").toUpperCase())), fmt(Number(r.total_amount))]),
    });
    doc.save(`gasbee-report-${from}-to-${to}.pdf`);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const summary = [
      ["Period", `${from} to ${to}`],
      ["Total Revenue", stats.revenue],
      ["Paid Orders", stats.orders],
      ["Avg Order Value", stats.avg],
      ["Refunded", stats.refunded],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paid.map((r) => ({
      Order: r.code, Date: new Date(r.created_at).toLocaleDateString(),
      Method: r.payment_method === "fpx" ? "FPX (Online Transfer)" : (r.payment_method === "card" ? "Credit Card" : (r.payment_method === "cod" ? "COD (Cash on Delivery)" : (r.payment_method ?? "").toUpperCase())), Amount: Number(r.total_amount),
    }))), "Paid Orders");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(refunded.map((r) => ({
      Order: r.code, Date: new Date(r.created_at).toLocaleDateString(), Amount: Number(r.total_amount),
    }))), "Refunds");
    XLSX.writeFile(wb, `gasbee-report-${from}-to-${to}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Sales summary by date range.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
          <Button onClick={load} disabled={loading}>{loading ? "Loading…" : "Apply"}</Button>
          <Button variant="outline" onClick={exportPDF}><FileDown className="mr-1 h-4 w-4" />PDF</Button>
          <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="mr-1 h-4 w-4" />Excel</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { l: "Total Revenue", v: fmt(stats.revenue) },
          { l: "Paid Orders", v: stats.orders },
          { l: "Avg Order Value", v: fmt(stats.avg) },
          { l: "Refunded", v: fmt(stats.refunded) },
        ].map((s) => (
          <Card key={s.l} className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</div>
            <div className="mt-2 text-2xl font-bold">{s.v}</div>
          </Card>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr className="text-left text-xs uppercase text-muted-foreground">
            <th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Method</th><th className="p-3">Amount</th>
          </tr></thead>
          <tbody>
            {paid.slice(0, 50).map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-3 font-mono text-xs">{r.code}</td>
                <td className="p-3 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="p-3">{r.payment_method === "fpx" ? "FPX (Online Transfer)" : (r.payment_method === "card" ? "Credit Card" : (r.payment_method === "cod" ? "COD (Cash on Delivery)" : (r.payment_method ?? "—").toUpperCase()))}</td>
                <td className="p-3">{fmt(Number(r.total_amount))}</td>
              </tr>
            ))}
            {paid.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No paid orders in range.</td></tr>}
          </tbody>
        </table>
        {paid.length > 50 && <div className="border-t p-3 text-center text-xs text-muted-foreground">Showing 50 of {paid.length}. Export for full list.</div>}
      </Card>
    </div>
  );
}
