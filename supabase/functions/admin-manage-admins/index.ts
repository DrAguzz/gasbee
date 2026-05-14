// Edge function: admin-manage-admins
// Allows existing admins to create new admin users, reset passwords, and update profiles.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_ROLES = ["super_admin", "admin", "operation_admin", "finance_admin", "support_admin"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: rolesRows } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const callerRoles = (rolesRows ?? []).map((r: { role: string }) => r.role);
    const isAdmin = callerRoles.some((r) => ADMIN_ROLES.includes(r));
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === "create") {
      const { email, password, full_name, phone, role } = body;
      if (!email || !password || !full_name || !role) {
        return json({ error: "Missing required fields (email, password, full_name, role)" }, 400);
      }
      if (!ADMIN_ROLES.includes(role)) return json({ error: "Invalid admin role" }, 400);
      if (String(password).length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

      let userId: string | null = null;
      const { data: existing } = await admin.auth.admin.listUsers();
      const found = existing?.users?.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
      if (found) {
        userId = found.id;
      } else {
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email, password, email_confirm: true, user_metadata: { full_name, phone },
        });
        if (cErr || !created.user) return json({ error: cErr?.message ?? "Failed to create user" }, 400);
        userId = created.user.id;
      }

      await admin.from("profiles").upsert({ id: userId!, full_name, phone: phone ?? null });
      // Remove customer default role; insert chosen admin role
      await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "customer");
      await admin.from("user_roles").insert({ user_id: userId, role }).select();

      return json({ user_id: userId });
    }

    if (action === "update_profile") {
      const { user_id, full_name, phone } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      const { error } = await admin.from("profiles").update({
        full_name, phone: phone ?? null,
      }).eq("id", user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { user_id, password } = body;
      if (!user_id || !password) return json({ error: "user_id and password required" }, 400);
      if (String(password).length < 6) return json({ error: "Password must be at least 6 characters" }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "set_role") {
      const { user_id, role } = body;
      if (!user_id || !role) return json({ error: "user_id and role required" }, 400);
      if (!ADMIN_ROLES.includes(role)) return json({ error: "Invalid admin role" }, 400);
      // Replace all admin roles with the new one
      await admin.from("user_roles").delete().eq("user_id", user_id).in("role", ADMIN_ROLES);
      const { error } = await admin.from("user_roles").insert({ user_id, role });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "set_active") {
      const { user_id, is_active } = body;
      if (!user_id || typeof is_active !== "boolean") return json({ error: "user_id and is_active required" }, 400);
      // Disable by banning user; enable by clearing ban
      const { error } = await admin.auth.admin.updateUserById(user_id, {
        ban_duration: is_active ? "none" : "876000h",
      });
      if (error) return json({ error: error.message }, 400);
      await admin.from("profiles").update({ is_active }).eq("id", user_id);
      return json({ ok: true });
    }

    if (action === "list") {
      // Return all users that have any admin role, plus their email
      const { data: rolesData } = await admin.from("user_roles").select("user_id, role").in("role", ADMIN_ROLES);
      const ids = Array.from(new Set((rolesData ?? []).map((r: { user_id: string }) => r.user_id)));
      if (!ids.length) return json({ admins: [] });
      const { data: profiles } = await admin.from("profiles").select("id, full_name, phone, avatar_url, is_active, created_at").in("id", ids);
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const emailMap = new Map<string, string>();
      users?.users?.forEach((u) => emailMap.set(u.id, u.email ?? ""));
      const roleMap = new Map<string, string>();
      (rolesData ?? []).forEach((r: { user_id: string; role: string }) => roleMap.set(r.user_id, r.role));
      const admins = (profiles ?? []).map((p) => ({
        ...p,
        email: emailMap.get(p.id) ?? "",
        role: roleMap.get(p.id) ?? "admin",
      }));
      return json({ admins });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
