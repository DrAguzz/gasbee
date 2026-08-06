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

    const body = await req.json();
    const mode = body.mode;
    // Trim: copy-pasted keys often carry leading/trailing whitespace, which breaks
    // both the Bearer header and the HMAC signing string.
    const api_key = String(body.api_key ?? "").trim();
    const api_secret = String(body.api_secret ?? "").trim();
    if (!api_key) throw new Error("api_key required");
    if (!api_secret) throw new Error("api_secret required (CHIP Send uses API Key + API Secret)");
    // CHIP Send does not use a Brand ID; authentication is API Key + HMAC-SHA512 signature.

    // CHIP Send lives on a different host than CHIP Collect (gate.chip-in.asia)
    const base = mode === "live"
      ? "https://api.chip-in.asia/api"
      : "https://staging-api.chip-in.asia/api";

    // Signing string per CHIP Send docs: `${epoch}${api_key}` with no separator.
    const epoch = Math.floor(Date.now() / 1000).toString();
    const checksum = await hmacSha512Hex(api_secret, `${epoch}${api_key}`);

    const res = await fetch(`${base}/send/accounts`, {
      headers: {
        Authorization: `Bearer ${api_key}`,
        epoch,
        checksum,
        "Content-Type": "application/json",
      },
    });
    const text = await res.text();
    if (!res.ok) {
      const detail = text.slice(0, 300);
      const hint = res.status === 401
        ? " Check: API Key & API Secret are from CHIP Control → Settings → Applications, and the server clock must be within 30 seconds of CHIP's."
        : res.status === 400
        ? " The epoch/checksum headers may be missing or malformed."
        : "";
      return new Response(
        JSON.stringify({ ok: false, error: `CHIP Send ${res.status}: ${detail}${hint}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {}
    const accounts = Array.isArray(parsed) ? parsed : (parsed?.results ?? []);
    const balances = (Array.isArray(accounts) ? accounts : [])
      .map((a: any) => `${a?.currency ?? ""} ${a?.balance ?? a?.convertible_balance ?? ""}`.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");
    return new Response(
      JSON.stringify({
        ok: true,
        message: `Connected to CHIP Send (${mode}). ${Array.isArray(accounts) ? accounts.length : 0} account(s) found${balances ? ` — ${balances}` : ""}.`,
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
