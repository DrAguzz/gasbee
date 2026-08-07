import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHIP_BASE = "https://gate.chip-in.asia/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    // CHIP success_callback posts the Purchase object — treated as UNTRUSTED.
    const purchaseId = body?.id;
    if (!purchaseId || typeof purchaseId !== "string") {
      return new Response("missing fields", { status: 400, headers: corsHeaders });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // The payment row must already exist (created when we initiated the purchase).
    const { data: payment } = await admin
      .from("payments")
      .select("id, order_id, amount, status")
      .eq("gateway_ref", purchaseId)
      .maybeSingle();

    if (!payment) {
      console.error("chip-webhook: unknown gateway_ref");
      return new Response("unknown purchase", { status: 404, headers: corsHeaders });
    }

    // Verify server-side with CHIP instead of trusting the posted status.
    const { data: gw } = await admin
      .from("payment_gateways")
      .select("config")
      .eq("provider", "chip")
      .maybeSingle();
    const cfg = (gw?.config ?? {}) as Record<string, string>;
    const apiKey = (cfg.api_key || Deno.env.get("CHIP_API_KEY") || "").trim();
    if (!apiKey) {
      console.error("chip-webhook: CHIP not configured");
      return new Response("not configured", { status: 500, headers: corsHeaders });
    }

    const res = await fetch(`${CHIP_BASE}/purchases/${purchaseId}/`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error("chip-webhook: verification request failed", res.status);
      return new Response("verification failed", { status: 502, headers: corsHeaders });
    }
    const purchase = await res.json();

    const status = String(purchase?.status ?? "").toLowerCase();
    const paid = status === "paid" || status === "success";
    const reference = purchase?.reference;

    // The verified purchase must point at the same order we recorded.
    if (!reference || reference !== payment.order_id) {
      console.error("chip-webhook: reference mismatch");
      return new Response("reference mismatch", { status: 400, headers: corsHeaders });
    }

    if (paid) {
      // Amount must match what we charged (CHIP amounts are in cents).
      const cents = Number(purchase?.purchase?.total ?? purchase?.payment?.amount ?? NaN);
      const expected = Math.round(Number(payment.amount) * 100);
      if (Number.isFinite(cents) && Math.abs(cents - expected) > 1) {
        console.error("chip-webhook: amount mismatch");
        return new Response("amount mismatch", { status: 400, headers: corsHeaders });
      }
    }

    await admin.from("payments").update({
      status: paid ? "paid" : (["failed", "error", "cancelled", "expired"].includes(status) ? "failed" : "pending"),
      raw_payload: purchase,
    }).eq("id", payment.id);

    if (paid) {
      await admin.from("orders").update({ payment_status: "paid" }).eq("id", payment.order_id);
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: "webhook processing failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
