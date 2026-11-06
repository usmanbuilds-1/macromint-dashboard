/**
 * Deployment guard: the invitation UI is OFF until the admin Edge Function,
 * the auth signup trigger, and the first verified owner account exist.
 *
 * The flag does NOT secure the API. Invitation enforcement always belongs to
 * the Supabase auth BEFORE INSERT trigger after migration 0006 is applied.
 */
export const INVITE_REGISTRATION_ENABLED = import.meta.env['VITE_BETA_INVITES_ENABLED'] === "true";

/** Public accounts use the standard trial with no invite code. The matching
 * backend flag, one-use SQL signup ticket, and rate limit MUST be verified
 * before this build-time flag can be enabled in production. */
export const PUBLIC_REGISTRATION_ENABLED = import.meta.env['VITE_PUBLIC_REGISTRATION_ENABLED'] === "true";
