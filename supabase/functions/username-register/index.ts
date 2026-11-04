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

const USERNAME = /^[a-zA-Z0-9_]{3,20}$/;
const INVITE = /^MM-[A-F0-9]{40}$/i;

type SignUpBody = { username?: unknown; password?: unknown; name?: unknown; inviteCode?: unknown };

Deno.serve(async (request) => {
  const cors = preflight(request);
  if (cors) return cors;
  if (request.method !== "POST") return errorResponse("METHOD", "POST required", 405);

  // The feature MUST be deliberately enabled in both backend and frontend.
  if (Deno.env.get("USERNAME_REGISTRATION_ENABLED") !== "true" ||
      Deno.env.get("USERNAME_INVITE_TRIGGER_VERIFIED") !== "true") {
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

  // The service-role API creates a confirmed account without requiring
  // undeliverable mail. The database invitation trigger consumes its code.
  const { error: signupError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, username: normalizedUsername, beta_invite_code: inviteCode },
  });
  if (signupError) {
    // Avoid username enumeration, duplicate-account disclosure and raw DB errors.
    return errorResponse("SIGNUP_FAILED", "Unable to create account. Check your invitation or choose another username.", 400);
  }
  // Never include synthetic email or passwords in responses/logs.
  return json({ ok: true, needsVerification: false }, 201);
});
