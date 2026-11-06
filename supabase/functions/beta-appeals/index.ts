// Beta reactivation requests: user-scoped status, owner-only decisions.
// Service-role reads are filtered to the validated Auth UID; there is no
// client-supplied user ID in any non-owner action.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { json, errorResponse, preflight, readJsonObject } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== "POST") return errorResponse("METHOD", "POST only", 405);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /i, "");
  if (!token) return errorResponse("AUTH", "Sign in required", 401);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return errorResponse("CONFIG", "Service unavailable", 503);
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await sb.auth.getUser(token);
  if (authError || !authData.user) return errorResponse("AUTH", "Invalid session", 401);
  const userId = authData.user.id;
  const raw = await readJsonObject(req);
  if (!raw || typeof raw.action !== "string") return errorResponse("INPUT", "Invalid request", 400);

  if (raw.action === "status") {
    const { data, error } = await sb.from("beta_reactivation_requests")
      .select("id,status,created_at,reviewed_at,approved_days")
      .eq("user_id",userId).order("created_at",{ascending:false}).limit(10);
    if (error) return errorResponse("DB", "Could not load your requests", 500);
    // Only invited, non-admin accounts can request beta extensions.
    const [redemption, owner] = await Promise.all([
      sb.from("beta_invite_redemptions").select("id")
        .eq("user_id", userId).limit(1),
      sb.from("admin_users").select("role")
        .eq("user_id", userId).maybeSingle(),
    ]);
    if (redemption.error || owner.error)
      return errorResponse("DB", "Could not verify account category", 500);
    const isBetaTester = (redemption.data ?? []).length > 0 && !owner.data;
    return json({ requests: data ?? [], isBetaTester });
  }
  if (raw.action === "submit") {
    if (raw.message !== undefined && typeof raw.message !== "string")
      return errorResponse("INPUT", "Message must be text", 400);
    const message = (raw.message ?? "") as string;
    if (message.length > 500) return errorResponse("INPUT", "Message is too long", 400);
    const { data, error } = await sb.rpc("beta_submit_reactivation", {
      p_user: userId, p_message: message,
    });
    if (error) return errorResponse("REQUEST", "You cannot submit another request right now", 409);
    return json({ request: data }, 201);
  }

  // All operational queries and mutations below are owner-only.
  const { data: operator, error: roleError } = await sb.from("admin_users")
    .select("role").eq("user_id",userId).maybeSingle();
  if (roleError || operator?.role !== "owner")
    return errorResponse("FORBIDDEN", "Owner only", 403);

  if (raw.action === "queue") {
    const { data, error } = await sb.from("beta_reactivation_requests")
      .select("id,user_id,status,message,created_at,reviewed_at,approved_days")
      .eq("status","pending").order("created_at",{ascending:true}).limit(100);
    if (error) return errorResponse("DB", "Could not load requests", 500);
    const rows = data ?? [];
    const ids = rows.map((r) => r.user_id);
    const { data: people, error: peopleError } = ids.length
      ? await sb.from("profiles").select("user_id,name,email").in("user_id", ids)
      : { data: [], error: null };
    if (peopleError) return errorResponse("DB", "Could not load requesters", 500);
    const names = new Map((people ?? []).map((p) => [p.user_id, { name: p.name, email: p.email }]));
    return json({ requests: rows.map((r) => ({ ...r, account: names.get(r.user_id) ?? null })) });
  }
  if (raw.action === "review") {
    if (typeof raw.requestId !== "string" ||
        !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(raw.requestId) ||
        typeof raw.approve !== "boolean" ||
        typeof raw.reason !== "string" ||
        raw.reason.trim().length < 3 || raw.reason.length > 1000 ||
        (raw.approve && (!Number.isInteger(raw.days) || Number(raw.days) < 1 || Number(raw.days) > 90))) {
      return errorResponse("INPUT", "A valid decision, reason and approval duration are required", 400);
    }
    const { data, error } = await sb.rpc("beta_review_reactivation", {
      p_owner: userId, p_request: raw.requestId, p_approve: raw.approve,
      p_days: raw.approve ? raw.days : null, p_reason: raw.reason.trim(),
    });
    if (error || !data?.ok) return errorResponse("DB", "Could not apply the decision", 409);
    return json({ ok: true, status: data.status });
  }
  return errorResponse("INPUT", "Unknown action", 400);
});
