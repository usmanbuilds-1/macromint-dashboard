# Macro Mint: public signups + private beta, one unified login

**Status:** source implementation, NOT proof of live activation. Owner controls Lovable SQL, Edge deployment, secrets, and publishing. Never set a VERIFIED flag without live evidence.

## Agreed product behavior

- Anyone can create a **regular account** with a username and password and receive the same ordinary trial configured in `app_settings.trial_days` (currently 14).
- Someone with an owner-issued `MM-` invitation can optionally enter it on that same registration form and is marked an **invited beta tester**. Only these non-admin tester accounts qualify for trial extensions/appeals.
- There is **one login page**. An invite is an account-creation credential, not a second login mode.
- At the end of beta, set `BETA_INVITATIONS_ENABLED=false` in Cloud and `VITE_BETA_INVITES_ENABLED=false` at build time. Existing beta testers keep their accounts; regular signup stays open.
- Payments are **not configured**. Normal users can still register and use their 14-day trials, but after expiration they'll be restricted to account-only privacy controls until legitimate paid checkout or other access options are available. Do not claim paid subscription support.

## Migration: backup first, then exactly one new file

1. Ensure SQL migrations 0014 and 0015 are installed on the intended Lovable Cloud database.
2. Back up the database. Run `drizzle/migrations/0016_public_registration_tickets.sql` once through Lovable Cloud SQL Editor. Do not replay 0006 or apply 0014/0015 again.
3. Confirm the new `public.public_signup_tickets` table, the service-role-only `issue_public_signup_ticket(text)` function, and both existing `auth.users` admission triggers. No public Auth signup should work without an invitation or server-minted ticket.

## Edge deployment: exact GitHub main SHA after CI merge

Deploy **all 10 current Edge bundles** in a single Lovable Build pass including their shared imports:
`username-register`, `username-recovery`, `beta-invites`,
`admin-action`, `admin-query`, `ai-scan`, `food-search`,
`delete-account`, `account-data`, `beta-appeals`.

Do not have Lovable regenerate source or migrate SQL as part of the Edge pass. Initially leave backend registration flags disabled. Verify the exact current bundled source, 503 for disabled registration/recovery, 401 for missing JWT on protected endpoints, and absence of unexpected 500 errors.

## Controlled production activation (separate from Edge deployment)

- Verify the trusted proxy overwrites incoming `CF-Connecting-IP` and cannot be spoofed via `X-Forwarded-For` or direct origin routes. A 503 response or mocked test is **not** sufficient. Ingress integrity, the SQL per-IP/per-username rate limiter, and request budgets must be proven with controlled non-sensitive requests.
- Only after positive verification: set server-side `USERNAME_REGISTRATION_RATE_LIMIT_VERIFIED=true`, `USERNAME_RECOVERY_RATE_LIMIT_VERIFIED=true`, `USERNAME_INVITE_TRIGGER_VERIFIED=true`, `USERNAME_PUBLIC_SIGNUP_TICKET_VERIFIED=true`.
- Set `USERNAME_REGISTRATION_ENABLED=true`, `USERNAME_RECOVERY_ENABLED=true`, `PUBLIC_REGISTRATION_ENABLED=true`. Set `BETA_INVITATIONS_ENABLED=true` to accept private tester codes.
- Enable build-time flags `VITE_USERNAME_AUTH_ENABLED=true`, `VITE_PUBLIC_REGISTRATION_ENABLED=true`, `VITE_BETA_INVITES_ENABLED=true`. **These are frontend build flags, not Cloud Edge secrets**. Publish after smoke testing preview. Do not expose any `SUPABASE_SERVICE_ROLE_KEY`, recovery code, plaintext invite, HMAC secret or signup ticket.
- Register the owner using the preexisting single-use bootstrap invite, save eight codes offline, verify that account's UUID, and manually promote **only** that verified account to owner. No automatic first-user promotion.
- Test a regular public signup with blank invite, an invited beta signup, a rejected reused/expired invite, a direct Supabase Auth signup without ticket (must fail), proof of rate limit 429, recovery, cross-account RLS, owner Admin, tester extension only, and data export/deletion.
- No genuine user should be onboarded while these checks are unverified.

## Read-only checks after SQL 0016

```sql
SELECT
  to_regclass('public.public_signup_tickets') IS NOT NULL AS tickets_table,
  to_regprocedure('public.issue_public_signup_ticket(text)') IS NOT NULL AS ticket_rpc,
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='auth.users'::regclass AND tgname='beta_check_before_signup'
      AND NOT tgisinternal
  ) AS before_insert_guard,
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='auth.users'::regclass AND tgname='beta_record_after_signup'
      AND NOT tgisinternal
  ) AS tester_recorder;
```

All four should be true.

## What is NOT a successful release

Merging GitHub, passing disposable CI, or having a `published` status does **not** prove public registration is live. Only live verified public and invited account creation, verified security boundaries, and a published current build can establish that.
