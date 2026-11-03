/**
 * Deployment guard: the invitation UI is OFF until the admin Edge Function,
 * the auth signup trigger, and the first verified owner account exist.
 *
 * The flag does NOT secure the API. Invitation enforcement always belongs to
 * the Supabase auth BEFORE INSERT trigger after migration 0006 is applied.
 */
export const INVITE_REGISTRATION_ENABLED = import.meta.env.VITE_BETA_INVITES_ENABLED === "true";
