import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacSha512Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Unauthorized");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) =>
      ["super_admin", "admin", "operation_admin", "finance_admin", "support_admin"].includes(r.role)
    );
    if (!isAdmin) throw new Error("Forbidden");

    const { mode, api_key, api_secret } = await req.json();
    if (!api_key) throw new Error("api_key required");
    if (!api_secret) throw new Error("api_secret required (CHIP Send uses API Key + API Secret)");
    // CHIP Send does not use a Brand ID; authentication is API Key + HMAC-SHA512 signature.

    // CHIP Send lives on a different host than CHIP Collect (gate.chip-in.asia)
    const base = mode === "live"
      ? "https://api.chip-in.asia/api"
      : "https://staging-api.chip-in.asia/api";

    const epoch = Math.floor(Date.now() / 1000).toString();
    const checksum = await hmacSha512Hex(api_secret, epoch);

    const res = await fetch(`${base}/send_limits/`, {
      headers: {
        Authorization: `Bearer ${api_key}`,
        epoch,
        checksum,
        "Content-Type": "application/json",
      },
    });
    const text = await res.text();
    if (!res.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `CHIP Send ${res.status}: ${text.slice(0, 300)}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {}
    const limits = Array.isArray(parsed) ? parsed : (parsed?.results ?? []);
    return new Response(
      JSON.stringify({
        ok: true,
        message: `Connected to CHIP Send (${mode}). ${Array.isArray(limits) ? limits.length : 0} send limit record(s) returned.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
