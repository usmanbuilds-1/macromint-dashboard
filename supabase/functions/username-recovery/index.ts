/**
 * Anonymous password recovery for username-only accounts using an offline
 * 128-bit one-use backup code. No email or phone contact information needed.
 *
 * SECURITY / RELEASE:
 *  - Requires staged migration 0008 and verified gateway rate limiting.
 *  - Rate limiting must apply to IP and account (username) to prevent guessing.
 *  - Never log usernames together with recovery codes, or return code hashes.
 *  - A consumed code cannot be used again even after a password update error.
 *  - Existing JWTs may remain valid until expiry; review Auth token lifetime.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { json, errorResponse, preflight, readJsonObject } from "../_shared/http.ts";
import { checkUsernameAuthBudget } from "../_shared/username-rate-limit.ts";

const USERNAME = /^[A-Za-z0-9_]{3,20}$/;
const CODE = /^MMR-(?:[A-F0-9]{8}-){3}[A-F0-9]{8}$/;
const INVALID = "Invalid username or recovery code.";

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== "POST") return errorResponse("METHOD", "POST only", 405);
  if (Deno.env.get("USERNAME_RECOVERY_ENABLED") !== "true" ||
      Deno.env.get("USERNAME_RECOVERY_RATE_LIMIT_VERIFIED") !== "true") {
    return errorResponse("NOT_CONFIGURED", "Recovery service is unavailable", 503);
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return errorResponse("NOT_CONFIGURED", "Recovery service unavailable", 503);

  const raw = await readJsonObject(req);
  if (!raw) return errorResponse("INPUT", "Invalid or oversized request", 400);
  const username = typeof raw.username === "string" ? raw.username.trim().toLowerCase() : "";
  const recoveryCode = typeof raw.recoveryCode === "string" ? raw.recoveryCode.trim().toUpperCase() : "";
  const newPassword = typeof raw.newPassword === "string" ? raw.newPassword : "";
  if (!USERNAME.test(username) || !CODE.test(recoveryCode) ||
      newPassword.length < 12 || newPassword.length > 256) {
    return errorResponse("INPUT", "Enter a valid username, recovery code and new password (12+ characters)", 400);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  // Throttle before database username lookups or any recovery-code redemption.
  // Missing infrastructure fails closed; never permit a bypass through a flag.
  const budget = await checkUsernameAuthBudget(req, "recover", username,
    (args) => admin.rpc("consume_username_auth_budget", args));
  if (budget === "unavailable") return errorResponse("NOT_CONFIGURED", "Recovery security checks unavailable", 503);
  if (budget === "limited") return errorResponse("RATE_LIMIT", "Too many recovery attempts. Try again later.", 429);

  const email = `${username}@macromint.internal`;
  const { data: profile, error: lookupError } = await admin.from("profiles")
    .select("user_id").eq("email", email).maybeSingle();
  if (lookupError || !profile) return errorResponse("INVALID_CODE", INVALID, 400);

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(recoveryCode));
  const codeHash = Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
  // Service-role-only RPC atomically consumes the code; concurrent reuse fails.
  const { data: consumed, error: consumeError } = await admin.rpc("consume_username_recovery_code", {
    p_user_id: profile.user_id,
    p_code_hash: codeHash,
  });
  if (consumeError) return errorResponse("NOT_CONFIGURED", "Recovery database unavailable", 503);
  if (consumed !== true) return errorResponse("INVALID_CODE", INVALID, 400);

  const { error: updateError } = await admin.auth.admin.updateUserById(profile.user_id, {
    password: newPassword,
  });
  if (updateError) return errorResponse("UPDATE_FAILED", "Password update failed. Use a different unused recovery code or contact support.", 503);
  return json({ ok: true });
});
