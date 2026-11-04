/**
 * Username-only beta enrollment. The public client NEVER receives a service
 * role credential. Supabase GoTrue still uses an internal synthetic email.
 *
 * DEPLOYMENT REQUIREMENTS (fail-closed):
 * - Set USERNAME_REGISTRATION_ENABLED=true and
 *   USERNAME_INVITE_TRIGGER_VERIFIED=true server-side ONLY after applying,
 *   testing and verifying the beta_require_invite BEFORE INSERT trigger.
 * - Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as Edge secrets.
 * - No automatic email confirmation or password recovery for synthetic users.
 * - Protect this endpoint at the gateway against abuse and monitor failures.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { json, errorResponse, preflight } from "../_shared/http.ts";
import { checkUsernameAuthBudget } from "../_shared/username-rate-limit.ts";

const USERNAME = /^[a-zA-Z0-9_]{3,20}$/;
const INVITE = /^MM-[A-F0-9]{40}$/i;

type SignUpBody = { username?: unknown; password?: unknown; name?: unknown; inviteCode?: unknown };

Deno.serve(async (request) => {
  const cors = preflight(request);
  if (cors) return cors;
  if (request.method !== "POST") return errorResponse("METHOD", "POST required", 405);

  // The feature MUST be deliberately enabled in both backend and frontend.
  if (Deno.env.get("USERNAME_REGISTRATION_ENABLED") !== "true" ||
      Deno.env.get("USERNAME_INVITE_TRIGGER_VERIFIED") !== "true" ||
      Deno.env.get("USERNAME_REGISTRATION_RATE_LIMIT_VERIFIED") !== "true") {
    return errorResponse("NOT_CONFIGURED", "Username registration is not enabled", 503);
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return errorResponse("NOT_CONFIGURED", "Registration service unavailable", 503);

  let body: SignUpBody;
  try { body = await request.json(); }
  catch { return errorResponse("INPUT", "Invalid request body", 400); }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode.trim().toUpperCase() : "";

  if (!USERNAME.test(username) || name.length < 2 || name.length > 100 ||
      password.length < 12 || password.length > 256 || !INVITE.test(inviteCode)) {
    return errorResponse("INPUT", "Invalid username, name, password or invitation", 400);
  }

  const normalizedUsername = username.toLowerCase();
  const email = `${normalizedUsername}@macromint.internal`;
  const admin = createClient(url, key, { auth: { persistSession: false } });

  // Fail closed if the SQL rate-limit RPC, trusted IP forwarding, or HMAC
  // secret is not configured. This complements verified edge-gateway throttling.
  const budget = await checkUsernameAuthBudget(request, "register", inviteCode,
    (args) => admin.rpc("consume_username_auth_budget", args));
  if (budget === "unavailable") return errorResponse("NOT_CONFIGURED", "Registration security checks unavailable", 503);
  if (budget === "limited") return errorResponse("RATE_LIMIT", "Too many registration attempts. Try again later.", 429);

  // Check invite availability before invoking privileged account creation.
  // The auth.users BEFORE INSERT trigger is still the FINAL atomic authority.
  const hashBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(inviteCode.toLowerCase()));
  const hash = Array.from(new Uint8Array(hashBytes), (n) => n.toString(16).padStart(2, "0")).join("");
  const { data: invite, error: inviteError } = await admin.from("beta_invites")
    .select("id,expires_at,revoked_at,used_count,max_uses")
    .eq("code_hash", hash).maybeSingle();
  if (inviteError) return errorResponse("NOT_CONFIGURED", "Invitation verification unavailable", 503);
  if (!invite || invite.revoked_at || Date.parse(invite.expires_at) <= Date.now() ||
      invite.used_count >= invite.max_uses) {
    return errorResponse("INVITE", "Invalid or unavailable invitation", 400);
  }

  // Recovery-code storage must exist before creating a non-email identity.
  const { error: recoveryTableError } = await admin.from("username_recovery_codes")
    .select("id", { head: true, count: "exact" }).limit(0);
  if (recoveryTableError) return errorResponse("NOT_CONFIGURED", "Recovery service unavailable", 503);

  const recoveryCodes = Array.from({ length: 8 }, () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const hex = Array.from(bytes, (n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
    return "MMR-" + hex.match(/.{1,8}/g)!.join("-");
  });
  const recoveryHashes = await Promise.all(recoveryCodes.map(async (code) => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
    return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
  }));

  // The service-role API creates a confirmed account without requiring
  // undeliverable mail. The database invitation trigger consumes its code.
  const { data: registered, error: signupError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, username: normalizedUsername, beta_invite_code: inviteCode },
  });
  if (signupError || !registered?.user) {
    // Avoid username enumeration, duplicate-account disclosure and raw DB errors.
    return errorResponse("SIGNUP_FAILED", "Unable to create account. Check your invitation or choose another username.", 400);
  }
  const { error: storeError } = await admin.from("username_recovery_codes").insert(
    recoveryHashes.map((code_hash) => ({ user_id: registered.user.id, code_hash })),
  );
  if (storeError) {
    // Fail closed: never leave a new email-less account without recovery.
    // The invitation may already have been consumed; an admin can issue another.
    await admin.auth.admin.deleteUser(registered.user.id);
    return errorResponse("RECOVERY_UNAVAILABLE", "Could not prepare account recovery. Ask the beta administrator for a new invitation.", 503);
  }
  // Never log or persist plaintext recovery codes. Display exactly once.
  return json({ ok: true, needsVerification: false, recoveryCodes }, 201);
});
