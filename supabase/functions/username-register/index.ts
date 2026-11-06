/**
 * Unified username signup for regular users and invited beta testers.
 * New public registrations require a server-issued, one-use SQL admission
 * ticket. Invited testers instead consume a private beta invitation.
 * Neither the service-role key nor the signup ticket reaches the browser.
 *
 * This endpoint remains fail-closed until gateway IP trust, atomic rate limits,
 * the owner-reviewed trigger, and backend activation flags are verified.
 * No email is sent for synthetic username accounts; eight recovery codes
 * are shown once after successful registration.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { json, errorResponse, preflight, readJsonObject } from "../_shared/http.ts";
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
      Deno.env.get("USERNAME_REGISTRATION_RATE_LIMIT_VERIFIED") !== "true") {
    return errorResponse("NOT_CONFIGURED", "Username registration is not enabled", 503);
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return errorResponse("NOT_CONFIGURED", "Registration service unavailable", 503);

  const body: SignUpBody | null = await readJsonObject(request);
  if (!body) return errorResponse("INPUT", "Invalid or oversized request body", 400);

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (body.inviteCode !== undefined && body.inviteCode !== null &&
      typeof body.inviteCode !== "string") {
    return errorResponse("INPUT", "Invalid invitation format", 400);
  }
  const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode.trim().toUpperCase() : "";
  const isTester = inviteCode.length > 0;

  if (!USERNAME.test(username) || name.length < 2 || name.length > 100 ||
      password.length < 12 || password.length > 256 ||
      (isTester && !INVITE.test(inviteCode))) {
    return errorResponse("INPUT", "Invalid username, name, password or invitation", 400);
  }

  if (isTester && (Deno.env.get("USERNAME_INVITE_TRIGGER_VERIFIED") !== "true" ||
      Deno.env.get("BETA_INVITATIONS_ENABLED") === "false")) {
    return errorResponse("NOT_CONFIGURED", "Tester invitations are unavailable", 503);
  }
  if (!isTester && (Deno.env.get("PUBLIC_REGISTRATION_ENABLED") !== "true" ||
      Deno.env.get("USERNAME_PUBLIC_SIGNUP_TICKET_VERIFIED") !== "true")) {
    return errorResponse("NOT_CONFIGURED", "Public registration is not enabled", 503);
  }

  const normalizedUsername = username.toLowerCase();
  const email = `${normalizedUsername}@macromint.internal`;
  const admin = createClient(url, key, { auth: { persistSession: false } });

  // Fail closed if the SQL rate-limit RPC, trusted IP forwarding, or HMAC
  // secret is not configured. This complements verified edge-gateway throttling.
  const budget = await checkUsernameAuthBudget(request, "register", normalizedUsername,
    (args) => admin.rpc("consume_username_auth_budget", args));
  if (budget === "unavailable") return errorResponse("NOT_CONFIGURED", "Registration security checks unavailable", 503);
  if (budget === "limited") return errorResponse("RATE_LIMIT", "Too many registration attempts. Try again later.", 429);

  if (isTester) {
    // Preflight for friendly errors only. The auth.users trigger still performs
    // the final atomic invitation redemption in the user-creation transaction.
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
  }

  // Recovery-code storage must exist before creating a non-email identity.
  const { error: recoveryTableError } = await admin.from("username_recovery_codes")
    .select("id", { head: true, count: "exact" }).limit(0);
  if (recoveryTableError) return errorResponse("NOT_CONFIGURED", "Recovery service unavailable", 503);

  // Normal users never need an invite. Instead, a 256-bit random secret
  // authorizes ONE auth.users insert only after all registration checks pass.
  // The SQL BEFORE INSERT trigger consumes its hash, strips plaintext
  // metadata, and rejects direct Supabase Auth signup attempts.
  let signupTicket: string | null = null;
  if (!isTester) {
    const rawTicket = crypto.getRandomValues(new Uint8Array(32));
    signupTicket = Array.from(rawTicket, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(signupTicket));
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const { data: issued, error: issueError } = await admin.rpc("issue_public_signup_ticket", {
      p_hash: hash,
    });
    if (issueError || issued !== true) {
      return errorResponse("NOT_CONFIGURED", "Public registration security is unavailable", 503);
    }
  }

  const recoveryCodes = Array.from({ length: 8 }, () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const hex = Array.from(bytes, (n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
    return "MMR-" + hex.match(/.{1,8}/g)!.join("-");
  });
  const recoveryHashes = await Promise.all(recoveryCodes.map(async (code) => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
    return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
  }));

  // GoTrue generates a normal confirmed username identity. Only the SQL
  // trigger can authorize the chosen account category; it removes the
  // private code or signup ticket before storing user metadata.
  const { data: registered, error: signupError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name, username: normalizedUsername,
      ...(isTester ? { beta_invite_code: inviteCode } : { public_signup_ticket: signupTicket }),
    },
  });
  if (signupError || !registered?.user) {
    // Avoid username enumeration, duplicate-account disclosure and raw DB errors.
    return errorResponse("SIGNUP_FAILED", "Unable to create account. Check your details or choose another username.", 400);
  }
  const { error: storeError } = await admin.from("username_recovery_codes").insert(
    recoveryHashes.map((code_hash) => ({ user_id: registered.user.id, code_hash })),
  );
  if (storeError) {
    // Fail closed: never leave a new email-less account without recovery.
    // The invitation may already have been consumed; an admin can issue another.
    await admin.auth.admin.deleteUser(registered.user.id);
    return errorResponse("RECOVERY_UNAVAILABLE", "Could not prepare account recovery. Try again or contact support.", 503);
  }
  // Never log or persist plaintext recovery codes. Display exactly once.
  return json({ ok: true, needsVerification: false, recoveryCodes }, 201);
});
