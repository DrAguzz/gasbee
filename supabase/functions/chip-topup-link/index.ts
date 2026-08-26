import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHIP_BASE = "https://gate.chip-in.asia/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ ok: false, error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return json({ ok: false, error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ ok: false, error: "A valid amount is required." }, 400);
    }
    const reference = typeof body?.reference === "string" ? body.reference.trim().slice(0, 120) : "";
    const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 500) : "";

    const { data: gw } = await admin
      .from("payment_gateways")
      .select("enabled, config")
      .eq("provider", "chip")
      .maybeSingle();
    const cfg = (gw?.config ?? {}) as Record<string, string>;
    const apiKey = (cfg.api_key || Deno.env.get("CHIP_API_KEY") || "").trim();
    const brandId = (cfg.brand_id || Deno.env.get("CHIP_BRAND_ID") || "").trim();
    if (gw && gw.enabled === false) return json({ ok: false, error: "CHIP Collect is disabled by admin." }, 400);
    if (!apiKey || !brandId) return json({ ok: false, error: "CHIP Collect is not configured." }, 400);

    const rounded = Math.round(amount * 100) / 100;

    const { data: movement, error: insErr } = await admin
      .from("fund_movements")
      .insert({
        direction: "bank_to_chip",
        amount: rounded,
        moved_at: new Date().toISOString().slice(0, 10),
        reference: reference || null,
        notes: notes || null,
        status: "pending",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (insErr || !movement) return json({ ok: false, error: insErr?.message ?? "Could not create top-up record." }, 400);

    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/chip-webhook`;

    const payload = {
      brand_id: brandId,
      success_callback: callbackUrl,
      reference: `topup:${movement.id}`,
      purchase: {
        currency: "MYR",
        products: [{ name: "CHIP Collect top-up (Gasbee)", price: Math.round(rounded * 100), quantity: 1 }],
      },
      client: {
        email: user.email ?? "finance@gasbee.app",
        full_name: "Gasbee Finance",
      },
    };

    const res = await fetch(`${CHIP_BASE}/purchases/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("chip-topup-link: CHIP error", res.status);
      await admin.from("fund_movements").update({ status: "failed" }).eq("id", movement.id);
      return json({ ok: false, error: `CHIP: ${JSON.stringify(data)}` }, 400);
    }

    await admin
      .from("fund_movements")
      .update({ chip_purchase_id: data.id, checkout_url: data.checkout_url })
      .eq("id", movement.id);

    return json({ ok: true, url: data.checkout_url, purchase_id: data.id, movement_id: movement.id });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "Could not create payment link." }, 400);
  }
});
