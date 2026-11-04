/**
 * Username-only sign-in adapter for GoTrue email/password.
 *
 * This is NOT an address where email can be delivered. Never use it for
 * confirmation, password reset, contact, alerts, or account recovery.
 *
 * Authentication identifier changes are disabled in production until
 * a controlled rollout of the email-provider settings and invitation trigger.
 */
export const INTERNAL_USERNAME_DOMAIN = "macromint.internal";
const USERNAME_FORMAT = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Case-insensitive ASCII usernames with no collision-producing character stripping. */
export function isValidUsername(username: string): boolean {
  return USERNAME_FORMAT.test(username.trim());
}

export function canonicalUsername(username: string): string {
  const trimmed = username.trim();
  if (!isValidUsername(trimmed)) {
    throw new RangeError("Username must be 3–20 letters, numbers, or underscores.");
  }
  return trimmed.toLowerCase();
}

/** Supabase GoTrue requires an email value for its email/password provider. */
export function usernameToEmail(username: string): string {
  return `${canonicalUsername(username)}@${INTERNAL_USERNAME_DOMAIN}`;
}

/** A real administrator email is still accepted for existing accounts. */
export function identifierToAuthEmail(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    if (!EMAIL_FORMAT.test(trimmed) || trimmed.length > 254) {
      throw new RangeError("Enter a valid username or existing account email.");
    }
    return trimmed.toLowerCase();
  }
  return usernameToEmail(trimmed);
}

/** Only exposes canonical usernames for specifically reserved internal identifiers. */
export function usernameFromAuthEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const suffix = `@${INTERNAL_USERNAME_DOMAIN}`;
  const address = email.toLowerCase();
  if (!address.endsWith(suffix)) return null;
  const local = address.slice(0, -suffix.length);
  return isValidUsername(local) ? canonicalUsername(local) : null;
}

export function publicAccountLabel(account: { username?: string | null; email?: string | null; name?: string | null }): string {
  const internal = usernameFromAuthEmail(account.email);
  const username = account.username && isValidUsername(account.username) ? canonicalUsername(account.username) : internal;
  if (username) return `@${username}`;
  if (account.email) return account.email;
  return account.name ?? "Your account";
}
