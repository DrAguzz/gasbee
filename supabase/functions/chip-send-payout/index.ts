import { chipError, chipSendFetch, corsHeaders, json, loadChipSendCreds, requireAdmin } from "../_shared/chip-send.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { admin } = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const settlementId = String(body?.settlement_id ?? "");
    const riderSettlementId = String(body?.rider_settlement_id ?? "");
    if (!settlementId && !riderSettlementId) {
      return json({ ok: false, error: "settlement_id or rider_settlement_id is required." }, 400);
    }

    const isRider = !!riderSettlementId;
    const table = isRider ? "rider_settlements" : "settlements";
    const rowId = isRider ? riderSettlementId : settlementId;

    const { data: settlement } = await admin.from(table).select("*").eq("id", rowId).maybeSingle();
    if (!settlement) throw new Error("Settlement not found.");
    if (settlement.chip_send_instruction_id) {
      throw new Error("This settlement already has a CHIP Send payout.");
    }
    if (settlement.status === "paid") throw new Error("This settlement is already paid.");

    const amount = Number(settlement.net_payout);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Net payout must be greater than zero.");

    let bankQuery = admin
      .from("payout_bank_accounts")
      .select("*")
      .not("chip_bank_account_id", "is", null);
    bankQuery = isRider
      ? bankQuery.eq("owner_type", "rider").eq("rider_id", settlement.rider_id)
      : bankQuery.eq("owner_type", "merchant").eq("merchant_id", settlement.merchant_id);

    const { data: bank } = await bankQuery.order("is_default", { ascending: false }).limit(1).maybeSingle();
    if (!bank) {
      throw new Error(`This ${isRider ? "rider" : "merchant"} has no bank account registered with CHIP Send yet.`);
    }
    if (bank.status && !["verified", "pending"].includes(bank.status)) {
      throw new Error(`Bank account is not usable (status: ${bank.status}).`);
    }

    let recipientEmail: string | undefined = bank.email || undefined;
    let notifyUserId: string | null = null;

    if (isRider) {
      const { data: rider } = await admin.from("riders").select("user_id, full_name").eq("id", settlement.rider_id).maybeSingle();
      notifyUserId = rider?.user_id ?? null;
    } else {
      const { data: merchant } = await admin.from("merchants").select("owner_id, email").eq("id", settlement.merchant_id).maybeSingle();
      recipientEmail = recipientEmail || merchant?.email || undefined;
      notifyUserId = merchant?.owner_id ?? null;
    }

    const reference = `${isRider ? "RSTL" : "STL"}-${String(settlement.id).slice(0, 8).toUpperCase()}`;
    const creds = await loadChipSendCreds(admin);

    const res = await chipSendFetch(creds, "/send/send_instructions", {
      method: "POST",
      body: {
        bank_account_id: bank.chip_bank_account_id,
        amount: amount.toFixed(2),
        email: recipientEmail,
        description: `${isRider ? "Rider" : "Settlement"} payout ${settlement.period_start} to ${settlement.period_end}`.slice(0, 140),
        reference,
        send_recipient_receipt: true,
      },
    });

    if (!res.ok) {
      await admin.from(table).update({
        payout_state: "failed",
        payout_error: chipError(res.status, res.data).slice(0, 500),
      }).eq("id", rowId);
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
    await admin.from(table).update(patch).eq("id", rowId);

    if (notifyUserId) {
      await admin.from("notifications").insert({
        user_id: notifyUserId,
        type: "system",
        title: state === "completed" ? "Settlement paid" : "Settlement payout in progress",
        body: `Payout of RM ${amount.toFixed(2)} via CHIP Send (${state}).`,
        link: isRider ? "/merchant/rider/settlements" : "/merchant/settlements",
      });
    }

    return json({ ok: true, message: `Send instruction created (state: ${state}).`, data: res.data });
  } catch (e: any) {
    return json({ ok: false, error: e.message });
  }
});
