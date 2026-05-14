import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    // CHIP success_callback posts the Purchase object
    const purchaseId = body?.id;
    const status = (body?.status ?? "").toLowerCase();
    const orderId = body?.reference;

    if (!purchaseId || !orderId) {
      console.error("CHIP webhook missing fields", body);
      return new Response("missing fields", { status: 400, headers: corsHeaders });
    }

    const paid = status === "paid" || status === "success";

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    await admin.from("payments").update({
      status: paid ? "paid" : (status || "failed"),
      raw_payload: body,
    }).eq("gateway_ref", purchaseId);

    if (paid) {
      await admin.from("orders").update({ payment_status: "paid" }).eq("id", orderId);
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
