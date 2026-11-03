// ═══════════════════════════════════════════════════════════════════════
// Macromint Edge Function: admin-query
// Read side of the admin panel. Ordinary RLS cannot let an admin read
// other users' profiles, so admin reads run here with the service role,
// behind an is_admin check.
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { json, errorResponse, preflight } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return errorResponse("METHOD", "POST only", 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return errorResponse("AUTH", "Missing bearer token", 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: userData, error: userError } = await admin.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  const caller = userData?.user;
  if (userError || !caller) return errorResponse("AUTH", "Invalid token", 401);

  const { data: adminRow } = await admin
    .from("admin_users")
    .select("role")
    .eq("user_id", caller.id)
    .maybeSingle();
  if (!adminRow) return errorResponse("FORBIDDEN", "Administrator access required", 403);

  let body: { action?: string; search?: string; targetUserId?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON", 400);
  }

  if (body.action === "list_users") {
    const search = (body.search ?? "").trim().toLowerCase();

    let query = admin
      .from("profiles")
      .select("user_id, email, name, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (search) query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    const { data: profileRows, error: profileError } = await query;
    if (profileError) return errorResponse("DB", profileError.message, 500);

    const ids = (profileRows ?? []).map((p) => p.user_id);
    const placeholder = ids.length ? ids : [crypto.randomUUID()];
    const [entRes, diaryRes] = await Promise.all([
      admin
        .from("entitlements")
        .select("user_id, state, trial_started_at, trial_ends_at, access_until, updated_at")
        .in("user_id", placeholder),
      admin
        .from("diary_entries")
        .select("user_id, entry_date")
        .in("user_id", placeholder)
        .gte("entry_date", new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)),
    ]);

    const entByUser = new Map((entRes.data ?? []).map((e) => [e.user_id, e]));
    const diaryByUser = new Map<string, { count: number; last: string | null }>();
    for (const d of diaryRes.data ?? []) {
      const cur = diaryByUser.get(d.user_id) ?? { count: 0, last: null };
      cur.count += 1;
      if (!cur.last || d.entry_date > cur.last) cur.last = d.entry_date;
      diaryByUser.set(d.user_id, cur);
    }

    const users = (profileRows ?? []).map((p) => {
      const e = entByUser.get(p.user_id);
      const usage = diaryByUser.get(p.user_id);
      return {
        userId: p.user_id,
        email: p.email,
        name: p.name,
        createdAt: p.created_at,
        entitlement: e
          ? {
              userId: e.user_id,
              state: e.state,
              trialStartedAt: e.trial_started_at,
              trialEndsAt: e.trial_ends_at,
              accessUntil: e.access_until,
              updatedAt: e.updated_at,
            }
          : null,
        diaryCount30d: usage?.count ?? 0,
        lastDiaryDate: usage?.last ?? null,
      };
    });
    return json({ users });
  }

  if (body.action === "get_audit") {
    let q = admin
      .from("admin_audit_logs")
      .select("id, admin_id, target_user_id, action, previous_state, new_state, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (body.targetUserId) q = q.eq("target_user_id", body.targetUserId);
    const { data, error } = await q;
    if (error) return errorResponse("DB", error.message, 500);
    return json({ entries: data ?? [] });
  }

  if (body.action === "get_settings") {
    const { data, error } = await admin.from("app_settings").select("*").eq("id", 1).maybeSingle();
    if (error) return errorResponse("DB", error.message, 500);
    return json({ settings: data });
  }

  if (body.action === "get_user") {
    if (!body.targetUserId) return errorResponse("BAD_REQUEST", "targetUserId required", 400);
    const [{ data: profile }, { data: ent }, { data: payments }] = await Promise.all([
      admin.from("profiles").select("*").eq("user_id", body.targetUserId).maybeSingle(),
      admin.from("entitlements").select("*").eq("user_id", body.targetUserId).maybeSingle(),
      admin
        .from("payments")
        .select("id, amount, currency, status, provider, created_at")
        .eq("user_id", body.targetUserId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    return json({ profile, entitlement: ent, payments: payments ?? [] });
  }

  return errorResponse("BAD_REQUEST", `Unknown action: ${body.action}`, 400);
});
