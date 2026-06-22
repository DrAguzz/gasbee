// Deletes a user account after admin approval of a deletion request.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Verify caller is admin
    const { data: isAdminData, error: roleErr } = await admin.rpc("is_admin", { _user_id: user.id });
    if (roleErr) return json({ error: roleErr.message }, 500);
    if (!isAdminData) return json({ error: "Forbidden" }, 403);

    const { request_id } = await req.json();
    if (!request_id) return json({ error: "request_id required" }, 400);

    const { data: reqRow, error: reqErr } = await admin
      .from("account_deletion_requests")
      .select("*")
      .eq("id", request_id)
      .maybeSingle();
    if (reqErr || !reqRow) return json({ error: "Request not found" }, 404);
    if (reqRow.status === "completed") return json({ error: "Already completed" }, 400);

    // Delete the auth user (cascades to profile via FK if configured; otherwise we clean up)
    const { error: delErr } = await admin.auth.admin.deleteUser(reqRow.user_id);
    if (delErr) return json({ error: delErr.message }, 500);

    // Best-effort cleanup of profile + roles
    await admin.from("user_roles").delete().eq("user_id", reqRow.user_id);
    await admin.from("profiles").delete().eq("id", reqRow.user_id);

    const { error: updErr } = await admin
      .from("account_deletion_requests")
      .update({
        status: "completed",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", request_id);
    if (updErr) return json({ error: updErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
