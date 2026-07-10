import jsPDF from "jspdf";
import gasbeeMark from "@/assets/gasbee-mark.png";

export interface ReceiptAddress {
  recipient_name?: string | null;
  recipient_phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postcode?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface ReceiptOrder {
  code: string;
  created_at?: string | null;
  total_amount: number | string;
  items_subtotal: number | string;
  delivery_fee: number | string;
  service_fee?: number | string | null;
  processing_fee?: number | string | null;
  discount?: number | string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  address_snapshot?: ReceiptAddress | null;
  merchants?: { name?: string | null; phone?: string | null; address?: string | null; city?: string | null; postcode?: string | null; state?: string | null } | null;
}

export interface ReceiptItem {
  product_name: string;
  type?: string | null;
  quantity: number | string;
  unit_price: number | string;
  subtotal: number | string;
}

const money = (v: string | number | null | undefined) => `RM ${Number(v || 0).toFixed(2)}`;

const TYPE_LABEL: Record<string, string> = {
  refill: "LPG Refill",
  new_cylinder: "New Cylinder Gas",
  deposit: "Cylinder Deposit",
};

export function formatOrderItemName(it: { product_name?: string | null; type?: string | null }): string {
  const name = (it.product_name ?? "").trim();
  const label = it.type ? TYPE_LABEL[it.type] : null;
  if (!label) return name || "Item";
  if (!name) return label;
  // Skip if name already begins with the category label
  if (name.toLowerCase().startsWith(label.toLowerCase())) return name;
  return `${label}, ${name}`;
}

// Brand palette
const BRAND = {
  amber: [245, 158, 11] as [number, number, number], // primary amber
  ink: [17, 24, 39] as [number, number, number], // near-black
  body: [55, 65, 81] as [number, number, number],
  muted: [120, 120, 120] as [number, number, number],
  hair: [229, 231, 235] as [number, number, number],
  soft: [255, 251, 235] as [number, number, number], // light amber bg
};

async function loadImageDataUrl(src: string): Promise<string> {
  const res = await fetch(src);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export async function generateReceiptPdf(
  order: ReceiptOrder,
  items: ReceiptItem[]
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 48; // margin

  // === HEADER BAND ===
  doc.setFillColor(...BRAND.ink);
  doc.rect(0, 0, pageW, 110, "F");
  // amber accent stripe
  doc.setFillColor(...BRAND.amber);
  doc.rect(0, 110, pageW, 4, "F");

  // Logo (mark)
  try {
    const logo = await loadImageDataUrl(gasbeeMark);
    doc.addImage(logo, "PNG", M, 28, 56, 46);
  } catch {
    // ignore
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Gasbee", M + 70, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(255, 200, 100);
  doc.text("BE READY · BEE DELIVERS", M + 70, 72);

  // Right side: RECEIPT label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text("RECEIPT", pageW - M, 56, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(255, 200, 100);
  doc.text(`No. ${order.code}`, pageW - M, 74, { align: "right" });
  doc.setTextColor(220, 220, 220);
  doc.setFontSize(9);
  doc.text(
    order.created_at ? new Date(order.created_at).toLocaleString() : "",
    pageW - M,
    88,
    { align: "right" }
  );

  // === META ROW ===
  let y = 150;
  doc.setTextColor(...BRAND.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("MERCHANT", M, y);
  doc.text("DELIVER TO", pageW / 2, y);

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.ink);
  doc.text(order.merchants?.name || "—", M, y);
  const a = order.address_snapshot ?? {};
  doc.text(a.recipient_name || "—", pageW / 2, y);

  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.body);
  if (order.merchants?.phone) doc.text(String(order.merchants.phone), M, y);
  const mAddr = [order.merchants?.address, order.merchants?.postcode, order.merchants?.city, order.merchants?.state].filter(Boolean).join(", ");
  if (mAddr) {
    const ml = doc.splitTextToSize(mAddr, pageW / 2 - M - 10);
    doc.text(ml, M, y + 14);
  }
  if (a.recipient_phone) doc.text(String(a.recipient_phone), pageW / 2, y);

  const addr = [a.address_line1, a.address_line2, a.postcode, a.city, a.state]
    .filter(Boolean)
    .join(", ");
  if (addr) {
    y += 14;
    const lines = doc.splitTextToSize(addr, pageW / 2 - M - 10);
    doc.text(lines, pageW / 2, y);
    y += (lines.length - 1) * 11;
  }

  // === ITEMS TABLE ===
  y += 28;
  doc.setFillColor(...BRAND.soft);
  doc.rect(M, y - 14, pageW - M * 2, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.ink);
  doc.text("ITEM", M + 10, y);
  doc.text("QTY", pageW - M - 180, y, { align: "right" });
  doc.text("UNIT", pageW - M - 90, y, { align: "right" });
  doc.text("SUBTOTAL", pageW - M - 10, y, { align: "right" });
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.body);
  items.forEach((it, i) => {
    const nameLines = doc.splitTextToSize(formatOrderItemName(it), pageW - M * 2 - 220);
    const rowH = Math.max(18, nameLines.length * 13);
    if (i % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(M, y - 12, pageW - M * 2, rowH, "F");
    }
    doc.setTextColor(...BRAND.ink);
    doc.text(nameLines, M + 10, y);
    doc.setTextColor(...BRAND.body);
    doc.text(String(it.quantity), pageW - M - 180, y, { align: "right" });
    doc.text(money(it.unit_price), pageW - M - 90, y, { align: "right" });
    doc.setTextColor(...BRAND.ink);
    doc.text(money(it.subtotal), pageW - M - 10, y, { align: "right" });
    y += rowH;
  });

  // === TOTALS ===
  y += 10;
  doc.setDrawColor(...BRAND.hair);
  doc.line(pageW - M - 240, y, pageW - M, y);
  y += 16;

  const totalsRow = (label: string, value: string, opts?: { bold?: boolean; color?: [number, number, number] }) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.bold ? 12 : 10);
    doc.setTextColor(...(opts?.color ?? BRAND.body));
    doc.text(label, pageW - M - 240, y);
    doc.text(value, pageW - M - 10, y, { align: "right" });
    y += opts?.bold ? 18 : 15;
  };
  totalsRow("Subtotal", money(order.items_subtotal));
  totalsRow("Delivery Fee", money(order.delivery_fee));
  if (Number(order.service_fee || 0) > 0)
    totalsRow("Service Fee", money(order.service_fee));
  if (Number(order.processing_fee || 0) > 0)
    totalsRow("Processing Fee", money(order.processing_fee));
  if (Number(order.discount || 0) > 0)
    totalsRow("Discount", `- ${money(order.discount)}`);

  // grand total band
  y += 4;
  doc.setFillColor(...BRAND.ink);
  doc.rect(pageW - M - 250, y - 4, 250, 32, "F");
  doc.setFillColor(...BRAND.amber);
  doc.rect(pageW - M - 250, y - 4, 4, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL PAID", pageW - M - 235, y + 16);
  doc.setFontSize(16);
  doc.setTextColor(...BRAND.amber);
  doc.text(money(order.total_amount), pageW - M - 10, y + 17, { align: "right" });
  y += 40;

  // === PAYMENT BADGE ===
  y += 14;
  const status = (order.payment_status ?? "-").toUpperCase();
  const method = order.payment_method === "fpx" ? "FPX (Online Transfer)" : (order.payment_method === "card" ? "Credit Card" : (order.payment_method === "cod" ? "COD (Cash on Delivery)" : (order.payment_method ?? "-").toUpperCase()));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  doc.text("PAYMENT", M, y);
  y += 14;
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.ink);
  doc.text(`${method} · ${status}`, M, y);

  // === FOOTER ===
  const footY = pageH - 60;
  doc.setDrawColor(...BRAND.hair);
  doc.line(M, footY, pageW - M, footY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.ink);
  doc.text("Thank you for ordering with Gasbee 🐝", M, footY + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    "This receipt was generated automatically. For support, contact your merchant.",
    M,
    footY + 32
  );
  doc.text("gasbee.com.my", pageW - M, footY + 32, { align: "right" });

  return doc;
}

export async function downloadReceipt(orderId: string) {
  const { toast } = await import("sonner");
  const { Capacitor } = await import("@capacitor/core");
  const toastId = toast.loading("Memulakan muat turun resit...");
  console.log(`downloadReceipt started for orderId: ${orderId}`);

  try {
    const { supabase } = await import("@/integrations/supabase/client");
    console.log("Querying Supabase for order details...");
    const { data: order, error } = await supabase
      .from("orders")
      .select("*, merchants(name, phone, address, city, postcode, state)")
      .eq("id", orderId)
      .maybeSingle();
      
    if (error || !order) {
      console.error("Supabase order query failed:", error);
      throw new Error(error?.message || "Order not found");
    }
    console.log("Order retrieved:", JSON.stringify(order));

    console.log("Querying Supabase for order items...");
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);
      
    if (itemsError) {
      console.error("Supabase order items query failed:", itemsError);
    }
    console.log(`Retrieved ${items?.length || 0} order items.`);

    console.log("Generating jsPDF document...");
    const receiptOrder = order as unknown as ReceiptOrder;
    const doc = await generateReceiptPdf(receiptOrder, (items ?? []) as unknown as ReceiptItem[]);
    const filename = `Receipt-${receiptOrder.code}.pdf`;
    console.log(`Receipt filename: ${filename}`);

    if (Capacitor.isNativePlatform()) {
      console.log("Platform is Native. Commencing native saving...");
      
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const { FileOpener } = await import("@capacitor-community/file-opener");

      console.log("Converting PDF output to base64...");
      const dataUri = doc.output("datauristring");
      const base64Data = dataUri.includes(",") ? dataUri.split(",")[1] : dataUri;

      console.log("Writing PDF file to Cache directory...");
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });
      console.log("File write successful. Result URI:", writeResult.uri);

      console.log("Getting native file URI...");
      const uriResult = await Filesystem.getUri({
        directory: Directory.Cache,
        path: filename,
      });
      console.log("Native URI resolved:", uriResult.uri);

      console.log("Opening native file viewer...");
      await FileOpener.open({
        filePath: uriResult.uri,
        contentType: "application/pdf",
        openWithDefault: true,
      });
      console.log("Native file opener triggered successfully.");
      toast.success("Resit berjaya dimuat turun!", { id: toastId });
    } else {
      console.log("Platform is Web. Using browser save...");
      doc.save(filename);
      toast.success("Resit berjaya dimuat turun!", { id: toastId });
    }
  } catch (err) {
    const error = err as Error;
    console.error("Error downloading or opening receipt:", error);
    toast.error(`Gagal memuat turun resit: ${error.message || String(error)}`, { id: toastId });
    throw error;
  }
}
