/**
 * Separate activation from implementation. Existing email accounts and Lovable's
 * in-progress auth configuration remain untouched until the owner validates
 * the username-register Edge Function and backend invitation enforcement.
 */
export const USERNAME_AUTH_ENABLED = import.meta.env["VITE_USERNAME_AUTH_ENABLED"] === "true";

/** Username registrations require backend-confirmed synthetic identifiers. */
export const USERNAME_MIN_PASSWORD_LENGTH = 12;
