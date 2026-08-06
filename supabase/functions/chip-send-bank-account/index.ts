import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { chipError, chipSendFetch, corsHeaders, json, loadChipSendCreds, serviceClient } from "../_shared/chip-send.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Unauthorized");
    // User-scoped client: RLS decides whether this caller owns the bank account row.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "register");
    const id = String(body?.id ?? "");
    if (!id) return json({ ok: false, error: "Bank account id is required." }, 400);

    const { data: row, error: rowErr } = await userClient
      .from("payout_bank_accounts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (rowErr) throw new Error(rowErr.message);
    if (!row) throw new Error("Bank account not found or not accessible.");

    const admin = serviceClient();
    const creds = await loadChipSendCreds(admin);

    if (action === "delete") {
      if (row.chip_bank_account_id) {
        const res = await chipSendFetch(creds, `/send/bank_accounts/${row.chip_bank_account_id}`, { method: "DELETE" });
        if (!res.ok && res.status !== 404) {
          return json({ ok: false, error: chipError(res.status, res.data) });
        }
      }
      const { error } = await userClient.from("payout_bank_accounts").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return json({ ok: true, message: "Bank account removed." });
    }

    if (row.chip_bank_account_id) {
      // Already registered — refresh its status from CHIP instead of creating a duplicate.
      const res = await chipSendFetch(creds, `/send/bank_accounts/${row.chip_bank_account_id}`);
      if (!res.ok) return json({ ok: false, error: chipError(res.status, res.data) });
      await admin.from("payout_bank_accounts").update({
        status: res.data?.status ?? row.status,
        rejection_reason: res.data?.rejection_reason ?? null,
      }).eq("id", id);
      return json({ ok: true, message: `Bank account status: ${res.data?.status}`, data: res.data });
    }

    const reference = row.reference || `${row.owner_type}-${String(row.id).slice(0, 8)}`;
    const res = await chipSendFetch(creds, "/send/bank_accounts", {
      method: "POST",
      body: {
        account_number: String(row.account_number).replace(/\s+/g, ""),
        bank_code: String(row.bank_code).trim().toUpperCase(),
        name: row.account_name,
        reference,
      },
    });
    if (!res.ok) {
      await admin.from("payout_bank_accounts").update({
        status: "error",
        rejection_reason: chipError(res.status, res.data).slice(0, 500),
      }).eq("id", id);
      return json({ ok: false, error: chipError(res.status, res.data) });
    }

    await admin.from("payout_bank_accounts").update({
      chip_bank_account_id: res.data?.id ?? null,
      status: res.data?.status ?? "pending",
      rejection_reason: res.data?.rejection_reason ?? null,
      reference,
    }).eq("id", id);

    return json({
      ok: true,
      message: `Bank account registered with CHIP (status: ${res.data?.status ?? "pending"}).`,
      data: res.data,
    });
  } catch (e: any) {
    return json({ ok: false, error: e.message });
  }
});
