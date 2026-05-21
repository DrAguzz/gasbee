import jsPDF from "jspdf";

export interface ReceiptOrder {
  code: string;
  created_at?: string | null;
  total_amount: number | string;
  items_subtotal: number | string;
  delivery_fee: number | string;
  discount?: number | string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  address_snapshot?: any;
  merchants?: { name?: string | null; phone?: string | null } | null;
}

export interface ReceiptItem {
  product_name: string;
  quantity: number | string;
  unit_price: number | string;
  subtotal: number | string;
}

const money = (v: any) => `RM ${Number(v || 0).toFixed(2)}`;

export function generateReceiptPdf(order: ReceiptOrder, items: ReceiptItem[]): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Gasbee", 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Official Receipt", pageW - 40, y, { align: "right" });
  y += 24;

  doc.setDrawColor(200);
  doc.line(40, y, pageW - 40, y);
  y += 20;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Order ${order.code}`, 40, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    order.created_at ? new Date(order.created_at).toLocaleString() : "",
    pageW - 40,
    y,
    { align: "right" }
  );
  y += 16;
  if (order.merchants?.name) {
    doc.text(`Merchant: ${order.merchants.name}`, 40, y);
    y += 14;
  }

  const a = order.address_snapshot ?? {};
  if (a.recipient_name || a.address_line1) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Delivered to", 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    if (a.recipient_name) { doc.text(String(a.recipient_name), 40, y); y += 12; }
    if (a.recipient_phone) { doc.text(String(a.recipient_phone), 40, y); y += 12; }
    const addr = [a.address_line1, a.address_line2, a.postcode, a.city, a.state].filter(Boolean).join(", ");
    if (addr) {
      const lines = doc.splitTextToSize(addr, pageW - 80);
      doc.text(lines, 40, y);
      y += lines.length * 12;
    }
  }

  y += 10;
  doc.setDrawColor(220);
  doc.line(40, y, pageW - 40, y);
  y += 16;

  doc.setFont("helvetica", "bold");
  doc.text("Item", 40, y);
  doc.text("Qty", 320, y, { align: "right" });
  doc.text("Unit", 410, y, { align: "right" });
  doc.text("Subtotal", pageW - 40, y, { align: "right" });
  y += 6;
  doc.line(40, y, pageW - 40, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  items.forEach((it) => {
    const nameLines = doc.splitTextToSize(it.product_name, 260);
    doc.text(nameLines, 40, y);
    doc.text(String(it.quantity), 320, y, { align: "right" });
    doc.text(money(it.unit_price), 410, y, { align: "right" });
    doc.text(money(it.subtotal), pageW - 40, y, { align: "right" });
    y += Math.max(14, nameLines.length * 12);
  });

  y += 6;
  doc.line(40, y, pageW - 40, y);
  y += 16;

  const totalsRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, 320, y);
    doc.text(value, pageW - 40, y, { align: "right" });
    y += 14;
  };
  totalsRow("Subtotal", money(order.items_subtotal));
  totalsRow("Delivery", money(order.delivery_fee));
  if (Number(order.discount || 0) > 0) totalsRow("Discount", `- ${money(order.discount)}`);
  y += 4;
  doc.setDrawColor(180);
  doc.line(320, y, pageW - 40, y);
  y += 14;
  totalsRow("TOTAL", money(order.total_amount), true);

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Payment: ${(order.payment_method ?? "-").toUpperCase()} · ${(order.payment_status ?? "-").toUpperCase()}`,
    40,
    y
  );

  y += 30;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Thank you for ordering with Gasbee.", 40, y);
  y += 12;
  doc.text("This receipt was generated automatically.", 40, y);

  return doc;
}

export async function downloadReceipt(orderId: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, merchants(name, phone)")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) throw new Error(error?.message || "Order not found");
  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);
  const doc = generateReceiptPdf(order as any, (items ?? []) as any);
  doc.save(`Receipt-${(order as any).code}.pdf`);
}
