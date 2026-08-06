import { chipError, chipSendFetch, corsHeaders, json, loadChipSendCreds, requireAdmin } from "../_shared/chip-send.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { admin } = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const settlementId = String(body?.settlement_id ?? "");
    if (!settlementId) return json({ ok: false, error: "settlement_id is required." }, 400);

    const { data: settlement } = await admin
      .from("settlements")
      .select("*")
      .eq("id", settlementId)
      .maybeSingle();
    if (!settlement) throw new Error("Settlement not found.");
    if (settlement.chip_send_instruction_id) {
      throw new Error("This settlement already has a CHIP Send payout.");
    }
    if (settlement.status === "paid") throw new Error("This settlement is already paid.");

    const amount = Number(settlement.net_payout);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Net payout must be greater than zero.");

    const { data: bank } = await admin
      .from("payout_bank_accounts")
      .select("*")
      .eq("owner_type", "merchant")
      .eq("merchant_id", settlement.merchant_id)
      .not("chip_bank_account_id", "is", null)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!bank) throw new Error("This merchant has no bank account registered with CHIP Send yet.");
    if (bank.status && !["verified", "pending"].includes(bank.status)) {
      throw new Error(`Merchant bank account is not usable (status: ${bank.status}).`);
    }

    const { data: merchant } = await admin
      .from("merchants")
      .select("name, email")
      .eq("id", settlement.merchant_id)
      .maybeSingle();

    const reference = `STL-${String(settlement.id).slice(0, 8).toUpperCase()}`;
    const creds = await loadChipSendCreds(admin);

    const res = await chipSendFetch(creds, "/send/send_instructions", {
      method: "POST",
      body: {
        bank_account_id: bank.chip_bank_account_id,
        amount: amount.toFixed(2),
        email: bank.email || merchant?.email || undefined,
        description: `Settlement payout ${settlement.period_start} to ${settlement.period_end}`.slice(0, 140),
        reference,
        send_recipient_receipt: true,
      },
    });

    if (!res.ok) {
      await admin.from("settlements").update({
        payout_state: "failed",
        payout_error: chipError(res.status, res.data).slice(0, 500),
      }).eq("id", settlementId);
      return json({ ok: false, error: chipError(res.status, res.data) });
    }

    const state = res.data?.state ?? "pending";
    const patch: any = {
      chip_send_instruction_id: res.data?.id ?? null,
      payout_state: state,
      payout_error: null,
      status: state === "completed" ? "paid" : "processing",
    };
    if (state === "completed") patch.paid_at = new Date().toISOString();
    await admin.from("settlements").update(patch).eq("id", settlementId);

    if (merchant) {
      const { data: m } = await admin.from("merchants").select("owner_id").eq("id", settlement.merchant_id).maybeSingle();
      if (m?.owner_id) {
        await admin.from("notifications").insert({
          user_id: m.owner_id,
          type: "system",
          title: state === "completed" ? "Settlement paid" : "Settlement payout in progress",
          body: `Payout of RM ${amount.toFixed(2)} via CHIP Send (${state}).`,
          link: "/merchant/settlements",
        });
      }
    }

    return json({ ok: true, message: `Send instruction created (state: ${state}).`, data: res.data });
  } catch (e: any) {
    return json({ ok: false, error: e.message });
  }
});
