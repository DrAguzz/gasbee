import { corsHeaders, json, serviceClient } from "../_shared/chip-send.ts";

/**
 * CHIP Send webhook receiver.
 * Handles bank account verification results and send instruction state changes.
 * Public endpoint (CHIP calls it without a user JWT).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const payload = await req.json().catch(() => null);
    if (!payload) return json({ ok: false, error: "Invalid payload" }, 400);

    const admin = serviceClient();
    const event = String(payload?.event_type ?? payload?.event ?? "");
    const data = payload?.data ?? payload;

    if (event.includes("bank_account") || data?.account_number) {
      if (data?.id) {
        await admin.from("payout_bank_accounts").update({
          status: data.status ?? "pending",
          rejection_reason: data.rejection_reason ?? null,
        }).eq("chip_bank_account_id", data.id);
      }
    } else if (event.includes("send_instruction") || data?.state) {
      if (data?.id) {
        const state = String(data.state ?? "pending");
        const patch: any = { payout_state: state };
        if (state === "completed") {
          patch.status = "paid";
          patch.paid_at = new Date().toISOString();
          patch.payout_error = null;
        } else if (["rejected", "deleted"].includes(state)) {
          patch.status = "failed";
          patch.payout_error = `CHIP Send state: ${state}`;
        }
        await admin.from("settlements").update(patch).eq("chip_send_instruction_id", data.id);
      }
    }

    return json({ ok: true });
  } catch (e: any) {
    return json({ ok: false, error: e.message }, 200);
  }
});
