import { chipError, chipSendFetch, corsHeaders, json, loadChipSendCreds, requireAdmin } from "../_shared/chip-send.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { admin } = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ ok: false, error: "A positive amount is required." }, 400);
    }
    const rounded = Math.round(amount * 100) / 100;

    const creds = await loadChipSendCreds(admin);
    const res = await chipSendFetch(creds, "/send/send_limits", {
      method: "POST",
      body: { amount: rounded },
    });
    if (!res.ok) return json({ ok: false, error: chipError(res.status, res.data), data: res.data });

    return json({
      ok: true,
      message: `Budget allocation request of RM ${rounded.toFixed(2)} submitted. Approvers will receive an email — it must be approved before 12 PM MYT the next day.`,
      data: res.data,
    });
  } catch (e: any) {
    return json({ ok: false, error: e.message });
  }
});
