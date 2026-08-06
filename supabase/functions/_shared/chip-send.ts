import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Verifies the caller is signed in and has an admin role. Throws otherwise. */
export async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) throw new Error("Unauthorized");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = serviceClient();
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
  const isAdmin = (roles ?? []).some((r: any) =>
    ["super_admin", "admin", "operation_admin", "finance_admin", "support_admin"].includes(r.role)
  );
  if (!isAdmin) throw new Error("Forbidden");
  return { user, admin };
}

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

export type ChipSendCreds = { api_key: string; api_secret: string; base: string; mode: string };

/** Loads the saved CHIP Send credentials from the payment_gateways table. */
export async function loadChipSendCreds(admin: ReturnType<typeof serviceClient>): Promise<ChipSendCreds> {
  const { data } = await admin
    .from("payment_gateways")
    .select("enabled, mode, config")
    .eq("provider", "chip_send")
    .maybeSingle();
  if (!data) throw new Error("CHIP Send is not configured yet. Save credentials in Admin → Payment Gateway → Payment Send.");
  const cfg = (data.config ?? {}) as any;
  const api_key = String(cfg.api_key ?? "").trim();
  const api_secret = String(cfg.api_secret ?? "").trim();
  if (!api_key || !api_secret) throw new Error("CHIP Send API Key/Secret missing.");
  const mode = data.mode === "live" ? "live" : "sandbox";
  return {
    api_key,
    api_secret,
    mode,
    base: mode === "live" ? "https://api.chip-in.asia/api" : "https://staging-api.chip-in.asia/api",
  };
}

/**
 * Calls the CHIP Send API. Every request is signed with
 * HMAC-SHA512(secret = API Secret, message = `${epoch}${api_key}`).
 */
export async function chipSendFetch(
  creds: ChipSendCreds,
  path: string,
  init: { method?: string; body?: unknown } = {},
) {
  const epoch = Math.floor(Date.now() / 1000).toString();
  const checksum = await hmacSha512Hex(creds.api_secret, `${epoch}${creds.api_key}`);
  const res = await fetch(`${creds.base}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${creds.api_key}`,
      epoch,
      checksum,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

export function chipError(status: number, data: unknown) {
  const detail = typeof data === "string" ? data : JSON.stringify(data);
  const hint = status === 401
    ? " Check API Key/Secret and that the server clock is within 30 seconds."
    : status === 404
    ? " This API Key may not exist on the selected environment (staging needs a separate staging key)."
    : "";
  return `CHIP Send ${status}: ${detail.slice(0, 400)}${hint}`;
}
