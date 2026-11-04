# Username-only authentication — code-ready, NOT enabled in production

**Owner requirement:** invitation + username + password, no user email collection. Existing real-email administrators can still log in.

## What was built

- `src/lib/auth/username.ts`: case-insensitive 3–20 ASCII alphanumeric/underscore username handling with collision-safe strict validation (no silent character stripping). Maps to `username@macromint.internal` solely inside GoTrue. Never treat these addresses as deliverable.
- `src/features/auth/Register.tsx`, `Login.tsx`, `ResetPassword.tsx`: username fields behind a rollout flag; username recovery uses one-time offline backup codes, with the legacy administrator email-recovery flow still accessible.
- `supabase/functions/username-register`: anonymous, rate-limit-gated Edge Function that validates the 160-bit beta invitation, checks availability, and calls privileged `auth.admin.createUser({email_confirm:true})`. The database `beta_require_invite` BEFORE INSERT trigger must atomically consume the invite. It creates eight random 128-bit recovery codes, stores only their SHA-256 hashes, and returns raw codes exactly once.
- `drizzle/migrations/0008_username_recovery.sql`: service-role-only hash storage and atomic consume RPC, both inaccessible to normal users.
- `supabase/functions/username-recovery`: password recovery with username + unused backup code + 12+-character new password. Codes are used once and never written to application logs or persistent browser storage.
- Existing admin emails and login flow remain compatible. Synthetic identifiers display as `@username` in account chrome.

**Important:** The pre-existing demo backend is credential-free by design; it is not secure authentication and MUST NOT be deployed as the production adapter. The real Supabase adapter and server functions provide the authentication security.

## Required staging checklist (in order)

1. Back up the existing Lovable Cloud database, inspect active auth triggers, roles, policies and current accounts. Coordinate with Lovable's concurrently developed authentication changes; resolve conflicts before merging this branch.
2. Keep the existing GoTrue **Email/password provider enabled**; it is still required under the hood. **Do not globally disable email confirmation for real email users.** The username-register server function creates only synthetic accounts with `email_confirm: true`. The client never sends an undeliverable confirmation email.
3. Deploy and test `0006_closed_beta_invites.sql` first. Confirm both `beta_require_invite` BEFORE INSERT and `beta_record_signup` AFTER INSERT are installed and functioning. Direct GoTrue anonymous signup with no/used/revoked invite must fail.
4. Apply `0008_username_recovery.sql` in staging (not automatically via GitHub). Confirm unauthenticated and authenticated users cannot SELECT recovery hashes and cannot call `consume_username_recovery_code`; only server service-role credentials can.
5. Deploy `username-register` and `username-recovery` Edge Functions with service-role credentials **only as server secrets**. No `VITE_` frontend service-role keys, ever.
6. Set a **real gateway rate limit** for both endpoints by client/IP and account identifier. Invitation codes are high entropy but do not protect against request floods. Verify controls in penetration tests; then set server secrets `USERNAME_REGISTRATION_RATE_LIMIT_VERIFIED=true` and `USERNAME_RECOVERY_RATE_LIMIT_VERIFIED=true`.
7. Enable server secrets `USERNAME_INVITE_TRIGGER_VERIFIED=true`, `USERNAME_REGISTRATION_ENABLED=true`, `USERNAME_RECOVERY_ENABLED=true`. The server functions fail closed when any required flag is missing.
8. Enable **both** frontend `VITE_USERNAME_AUTH_ENABLED=true` and `VITE_BETA_INVITES_ENABLED=true` only after staging checks pass and the admin owner exists. Neither flag is an API security control.
9. Test a fresh account from start to finish: invite issuance → signup with username and 12+-character password → eight backup codes shown once → save codes → sign in → onboarding → log food → sign out and in → recover password with one code → reject code reuse → preserve existing email-based administrator login → reject duplicate uppercase/lowercase variants.
10. Test rate limits, reused/revoked/expired invitations, concurrency, account deletion, cross-user isolation, and provider outage. Verify no recovery codes or passwords in analytics/logs. Do **not** enable until failure cases behave safely.

## Important limitations and decisions

- No normal emailed password reset, contact address, email notifications or identity verification for username accounts. Users **must save offline backup codes**. If all codes are lost, self-service recovery is unavailable; design an explicit, identity-verified admin-assisted process before broad public launch.
- If storing backup hashes fails after an invitation is consumed, the server tries to delete the new account and returns an error. The invite may be lost; the administrator may need to issue a new one.
- Recovery code consumption is atomic. A consumed code remains used if the Auth password update fails; the user can use another unused backup code.
- Password reset may not immediately invalidate all previously issued short-lived JWT access tokens. The app must evaluate Auth expiry/session revocation policies and test the expected session lifecycle; do not claim instant global revocation.
- Current admin/email accounts remain recoverable through real email. Existing user accounts are not automatically converted to usernames.
- No proof of production readiness until the real Lovable-hosted Auth and email provider settings, SQL migrations and browser journey have been tested. GitHub compilation alone is not enough.
