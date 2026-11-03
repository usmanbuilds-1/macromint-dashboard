// ═══════════════════════════════════════════════════════════════════════
// Macromint Edge Function: admin-action
// Every entitlement change happens here, server-side, with an immutable
// audit record. The frontend never writes entitlements directly.
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { json, errorResponse, preflight } from "../_shared/http.ts";

interface ActionBody {
  action: string;
  targetUserId?: string;
  reason?: string;
  days?: number;
  date?: string;
  state?: string;
  note?: string;
}

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

  let body: ActionBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON", 400);
  }
  const { action, targetUserId, reason } = body;

  // ── Platform configuration actions (no target user) ────────────────────
  if (action === "set_trial_days" || action === "set_reward_config") {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (action === "set_trial_days") {
      const days = Number(body.days);
      if (!Number.isInteger(days) || days < 0 || days > 90) {
        return errorResponse("BAD_REQUEST", "days must be an integer between 0 and 90", 400);
      }
      patch.trial_days = days;
    } else {
      const hours = Number(body.days); // reuse field: hours of access per ad
      const maxAds = Number(body.date); // reuse field: daily ad cap
      if (!Number.isFinite(hours) || hours <= 0 || hours > 168) {
        return errorResponse("BAD_REQUEST", "reward hours must be between 1 and 168", 400);
      }
      if (Number.isFinite(maxAds)) patch.max_daily_rewarded_ads = Math.min(Math.max(Math.round(maxAds), 0), 20);
      patch.reward_access_hours = hours;
    }
    const { error } = await admin.from("app_settings").update(patch).eq("id", 1);
    if (error) return errorResponse("DB", error.message, 500);
    await admin.from("admin_audit_logs").insert({
      admin_id: caller.id,
      target_user_id: caller.id,
      action,
      reason: reason ?? null,
      metadata: patch,
    });
    return json({ ok: true });
  }

  if (!targetUserId) return errorResponse("BAD_REQUEST", "targetUserId is required", 400);

  const { data: current } = await admin
    .from("entitlements")
    .select("*")
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (!current) return errorResponse("NOT_FOUND", "No entitlement record for that user", 404);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let newState: string = current.state;
  let newTrialEnds: string | null = current.trial_ends_at;

  switch (action) {
    case "grant_access":
      newState = "paid_active";
      patch.access_until = null;
      break;
    case "grant_complimentary":
      newState = "complimentary";
      patch.access_until = null;
      break;
    case "revoke_access":
      newState = "revoked";
      break;
    case "restore_access": {
      const allowed = ["paid_active", "complimentary", "trial_active"];
      newState = allowed.includes(body.state ?? "") ? body.state! : "paid_active";
      break;
    }
    case "extend_trial":
    case "shorten_trial": {
      const days = Number(body.days);
      if (!Number.isInteger(days) || days <= 0 || days > 365) {
        return errorResponse("BAD_REQUEST", "days must be a positive integer", 400);
      }
      const sign = action === "extend_trial" ? 1 : -1;
      const base = new Date(Math.max(Date.parse(current.trial_ends_at), Date.now()));
      newTrialEnds = new Date(base.getTime() + sign * days * 86_400_000).toISOString();
      patch.trial_ends_at = newTrialEnds;
      if (newTrialEnds >= new Date().toISOString() && current.state !== "revoked" && current.state !== "suspended") {
        newState = "trial_active";
      }
      break;
    }
    case "set_expiry": {
      const when = body.date ? Date.parse(body.date) : NaN;
      if (Number.isNaN(when)) return errorResponse("BAD_REQUEST", "date must be ISO 8601", 400);
      newTrialEnds = new Date(when).toISOString();
      patch.trial_ends_at = newTrialEnds;
      if (current.state === "trial_active" || current.state === "trial_expired") {
        newState = when >= Date.now() ? "trial_active" : "trial_expired";
      }
      break;
    }
    case "suspend":
      newState = "suspended";
      break;
    case "reactivate":
      newState = newTrialEnds && newTrialEnds >= new Date().toISOString() ? "trial_active" : "paid_active";
      break;
    case "add_note":
      break;
    default:
      return errorResponse("BAD_REQUEST", `Unknown action: ${action}`, 400);
  }

  if (action !== "add_note") {
    patch.state = newState;
    const { error } = await admin.from("entitlements").update(patch).eq("user_id", targetUserId);
    if (error) return errorResponse("DB", error.message, 500);
  }

  await admin.from("admin_audit_logs").insert({
    admin_id: caller.id,
    target_user_id: targetUserId,
    action,
    previous_state: current.state,
    new_state: action === "add_note" ? null : newState,
    reason: reason ?? body.note ?? null,
    metadata: action === "add_note" ? { note: body.note ?? "" } : { patch },
  });

  const { data: updated } = await admin
    .from("entitlements")
    .select("*")
    .eq("user_id", targetUserId)
    .maybeSingle();
  return json({ ok: true, entitlement: updated });
});
