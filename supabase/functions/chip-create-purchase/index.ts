import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHIP_BASE = "https://gate.chip-in.asia/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Unauthorized");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Load gateway config from DB (preferred), fall back to env
    const { data: gw } = await adminClient
      .from("payment_gateways")
      .select("enabled, mode, config")
      .eq("provider", "chip")
      .maybeSingle();

    const cfg = (gw?.config ?? {}) as Record<string, string>;
    const apiKey = cfg.api_key || Deno.env.get("CHIP_API_KEY");
    const brandId = cfg.brand_id || Deno.env.get("CHIP_BRAND_ID");
    if (gw && gw.enabled === false) throw new Error("Chip-in payments are disabled by admin");
    if (!apiKey || !brandId) throw new Error("CHIP not configured");

    const { order_id, success_redirect, failure_redirect } = await req.json();
    if (!order_id) throw new Error("order_id required");

    const { data: order, error: oerr } = await supabase.from("orders").select("*").eq("id", order_id).maybeSingle();
    if (oerr || !order) throw new Error("Order not found");
    if (order.customer_id !== user.id) throw new Error("Forbidden");

    const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();

    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/chip-webhook`;

    const amountCents = Math.round(Number(order.total_amount) * 100);

    const payload = {
      brand_id: brandId,
      success_callback: callbackUrl,
      success_redirect: success_redirect || cfg.success_redirect || undefined,
      failure_redirect: failure_redirect || cfg.failure_redirect || undefined,

      reference: order.id,
      purchase: {
        currency: "MYR",
        products: [
          {
            name: `Order ${order.code}`,
            price: amountCents,
            quantity: 1,
          },
        ],
      },
      client: {
        email: user.email ?? "noreply@gasbee.app",
        full_name: profile?.full_name || (user.email ?? "Customer"),
        phone: profile?.phone || undefined,
      },
    };

    const res = await fetch(`${CHIP_BASE}/purchases/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("CHIP error", data);
      throw new Error(`CHIP: ${JSON.stringify(data)}`);
    }

    await adminClient.from("payments").insert({
      order_id: order.id,
      gateway: "chip",
      gateway_ref: data.id,
      amount: order.total_amount,
      status: "pending",
      raw_payload: data,
    });


    return new Response(JSON.stringify({ url: data.checkout_url, purchase_id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
