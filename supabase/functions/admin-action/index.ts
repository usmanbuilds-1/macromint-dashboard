// ═══════════════════════════════════════════════════════════════════════
// Macromint Edge Function: admin-action
// Every entitlement change happens here, server-side, with an immutable
// audit record. The frontend never writes entitlements directly.
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { json, errorResponse, preflight, readJsonObject } from "../_shared/http.ts";

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
  if (adminRow?.role !== "owner") return errorResponse("FORBIDDEN", "Owner access required", 403);

  const raw = await readJsonObject(req);
  if (!raw || typeof raw.action !== "string") {
    return errorResponse("BAD_REQUEST", "Invalid or oversized request", 400);
  }
  const body = raw as unknown as ActionBody;
  const { action, targetUserId, reason } = body;
  if ((reason !== undefined && typeof reason !== "string") ||
      (body.note !== undefined && typeof body.note !== "string")) {
    return errorResponse("BAD_REQUEST", "Reason and note must be text", 400);
  }

  // All app configuration and entitlement changes are database-atomic with
  // their audit rows. Applying an update without an audit entry must fail.
  const allowedActions = new Set([
    "set_trial_days", "set_reward_config",
    "grant_access", "grant_complimentary", "revoke_access", "restore_access",
    "extend_trial", "shorten_trial", "set_expiry", "suspend", "reactivate", "add_note",
  ]);
  if (!allowedActions.has(action)) return errorResponse("BAD_REQUEST", "Unknown action", 400);
  if (typeof reason === "string" && reason.length > 1000 ||
      typeof body.note === "string" && body.note.length > 1000) {
    return errorResponse("BAD_REQUEST", "Note or reason too long", 400);
  }
  const isConfig = action === "set_trial_days" || action === "set_reward_config";
  // Access decisions are never silent, including manual beta trial extensions.
  if (!isConfig && action !== "add_note" &&
      (typeof reason !== "string" || reason.trim().length < 3)) {
    return errorResponse("BAD_REQUEST", "A reason of at least 3 characters is required", 400);
  }
  if (!isConfig && (typeof targetUserId !== "string" ||
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(targetUserId))) {
    return errorResponse("BAD_REQUEST", "Valid target user ID required", 400);
  }
  if (isConfig) {
    const days = body.days;
    const hours = action === "set_reward_config" ? Number(days) : null;
    const ads = action === "set_reward_config" ? Number(body.date) : null;
    if (action === "set_trial_days" && (!Number.isInteger(days) || days! < 0 || days! > 90) ||
        action === "set_reward_config" &&
          (!Number.isFinite(hours) || hours! <= 0 || hours! > 168 ||
           !Number.isInteger(ads) || ads! < 0 || ads! > 20)) {
      return errorResponse("BAD_REQUEST", "Invalid application configuration", 400);
    }
    const { error } = await admin.rpc("admin_set_app_config", {
      p_admin: caller.id,
      p_action: action,
      p_days: action === "set_trial_days" ? days : null,
      p_hours: hours,
      p_ads: ads,
      p_reason: reason ?? null,
    });
    if (error) return errorResponse("DB", "Could not save application configuration", 500);
    return json({ ok: true });
  }

  if ((action === "extend_trial" || action === "shorten_trial") &&
      (!Number.isInteger(body.days) || body.days! < 1 || body.days! > 365)) {
    return errorResponse("BAD_REQUEST", "Invalid trial adjustment", 400);
  }
  if (action === "set_expiry" && (typeof body.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.date))) {
    return errorResponse("BAD_REQUEST", "Expiry must be YYYY-MM-DD", 400);
  }
  if (action === "restore_access" &&
      !["complimentary", "trial_active"].includes(body.state ?? "")) {
    return errorResponse("BAD_REQUEST", "Select a valid access state", 400);
  }

  const { data: updated, error } = await admin.rpc("admin_change_entitlement", {
    p_admin: caller.id,
    p_target: targetUserId,
    p_action: action,
    p_days: action === "extend_trial" || action === "shorten_trial" ? body.days : null,
    p_date: action === "set_expiry" ? body.date : null,
    p_state: action === "restore_access" ? body.state : null,
    p_reason: reason?.trim() ?? null,
    p_note: body.note ?? null,
  });
  if (error || !updated) return errorResponse("DB", "Could not apply audited access change", 500);
  return json({ ok: true, entitlement: updated });
});
