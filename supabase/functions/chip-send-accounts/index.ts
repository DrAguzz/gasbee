import { chipError, chipSendFetch, corsHeaders, json, loadChipSendCreds, requireAdmin } from "../_shared/chip-send.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { admin } = await requireAdmin(req);
    const creds = await loadChipSendCreds(admin);

    const accounts = await chipSendFetch(creds, "/send/accounts");
    if (!accounts.ok) return json({ ok: false, error: chipError(accounts.status, accounts.data) });

    const limits = await chipSendFetch(creds, "/send/send_limits");

    return json({
      ok: true,
      mode: creds.mode,
      accounts: accounts.data?.results ?? accounts.data ?? [],
      send_limits: limits.ok ? (limits.data?.results ?? []) : [],
      send_limits_error: limits.ok ? null : chipError(limits.status, limits.data),
    });
  } catch (e: any) {
    return json({ ok: false, error: e.message });
  }
});
