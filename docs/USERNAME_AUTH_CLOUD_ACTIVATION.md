# Macro Mint username authentication: safe manual activation

**State of this document:** preparation only. Nothing in this repository deploys a database
migration, sets a Cloud secret, deploys an Edge Function, or republishes the app.

**Live preflight, November 4, 2026:** Lovable Cloud reports **zero auth accounts** and
**zero admin accounts**. Direct read-only SQL confirms the invite tables and
signup triggers from `0006` are still absent, while `0007`, `0008`, and
`0009` have already been applied and verified. The owner reported that all
three Edge Functions were deployed, but the committed source for the public
handlers contained invalid literal newline escapes; this release repairs the
handlers and the formerly malformed/duplicated `0006` SQL. **Redeploy
`username-register` and `username-recovery` from the corrected merged
source before trying to activate them.** Seeing a 503 while the flags are
off is not a syntax, gateway or end-to-end security test.

**Current safe order:** 1. Merge repaired source and pass CI. 2. Owner
redeploys just the two corrected Edge Functions (a Lovable AI credit action,
never triggered automatically). 3. Owner privately configures
`USERNAME_AUTH_RATE_LIMIT_SECRET` in Lovable Cloud Secrets, leaving all
activation/verification flags false. 4. Verify the IP forwarding trust
boundary and the rate-limiting RPC under authenticated and unauthenticated
requests. 5. Apply corrected `0006` in Cloud SQL and create a private,
random one-use invite visible only in the owner's SQL editor. 6. Verify
the invite trigger and then enable the necessary backend flags. 7. Enable
the two frontend `VITE_` flags only after the backend passes acceptance
checks, sign up, store recovery codes privately, and promote the verified
owner UUID. 8. Run a two-account real RLS and login/recovery test.

## Live security gate — 2026-11-05

Read-only Cloud database verification confirms that the `0006` invitation tables
and both `auth.users` triggers are installed. There are no users or admins;
one previously exposed invitation is revoked, and a different unredeemed,
unexpired single-use owner invitation exists. Do not expose its plaintext.
The database rate-limit function was previously tested (first 2 calls allowed,
third rejected, transaction rolled back). The registration and recovery Edge
functions were redeployed from PR #20, but are still disabled.

**New release blocker:** `username-rate-limit.ts` used the leftmost
`X-Forwarded-For` value as fallback client IP. That entry may be caller supplied.
This patch removes that fallback entirely and instead fails closed unless a
syntactically valid `CF-Connecting-IP` value is present. Unit tests explicitly
reject forged XFF-only requests and invalid IP formats. This is source hardening,
**not** proof that the provider overwrites `CF-Connecting-IP`.

Activation now requires:
1. Merge this patch after CI and have Lovable **redeploy both**
   `username-register` and `username-recovery` with the changed shared
   `_shared/username-rate-limit.ts` from the new commit. The PR #20 deployments
   are no longer sufficient once this lands. Do not modify the website or
   enable any flags during this redeployment.
2. Verify the managed ingress (including custom domains / alternate routes)
   overwrites caller-supplied `CF-Connecting-IP` rather than forwarding it.
   Run controlled HTTP tests that send forged `CF-Connecting-IP` and
   `X-Forwarded-For`; verify observed identity and IP rate limits are
   unchanged. The current `503 NOT_CONFIGURED` guards execute **before** rate
   limiting, so they cannot demonstrate this. Do not treat Cloudflare presence,
   a static code audit, or a successful database RPC test alone as proof.
   Obtain the provider contract or safe observable end-to-end probe;
   do not publish raw IP addresses or access credentials.
3. Only after this proof, mark the corresponding backend verification
   secrets `true`, then explicitly enable registration and recovery backend
   flags. Keep the public app gated until ready.
4. Enable frontend build flags in source (`VITE_USERNAME_AUTH_ENABLED` and
   `VITE_BETA_INVITES_ENABLED`) only once backend checks pass, verify built
   assets, and let the owner publish.
5. Register the owner's real username/password through the private invite,
   store eight recovery codes offline, verify their own auth UUID, then
   promote that UUID in `admin_users`. Test disposable second account,
   failed invites, rate limiting, recovery, RLS isolation, and logout.

Do not change the public `app_settings` RLS read policy without reviewing
`supabase-backend.ts:getPublicSettings`, which reads that table directly;
an admin-only policy would silently substitute defaults for regular users.

**Owner constraint:** Do not invoke the Lovable agent or any operation consuming Lovable
build credits automatically. Ask the owner to initiate such a step.

This checklist supersedes the pasted "Deploy PR #9–#13" instructions. Do **not**
run its `MINT-BETA-2026-START` seed: it is not a valid invite code. The real
format is `MM-` plus 40 hexadecimal characters. Do **not** assume the
`supabase` CLI can reach a Lovable-managed Cloud database.

## 0. What the merged code already provides

- PR #9 protects the **local demo adapter**, not the production database.
- PR #10 has username login/registration, an invite-gated Edge Function and
  eight single-use offline recovery codes. New accounts internally use the
  synthetic identifier `username@macromint.internal`; users never supply
  personal email. Existing email-based accounts can still sign in.
- PR #11 provides account JSON, diary CSV and weight CSV exports.
- PR #12 exposes the weight logger from Trends via `/weight`. The route was
  generated and validated in CI with `pnpm build`.
- PR #13 hides macro percentages if their source data is incomplete.

**Do not re-run a database migration simply because a PR was merged.**
Run the diagnostics first. Changes below are for the Lovable Cloud backend,
not for your local demo or a separate Supabase project.

## 1. Locate backend and preserve a recovery point (owner, manual)

Open [the Macro Mint Lovable project](https://lovable.dev/projects/faa9bf14-f641-4129-94e2-d944468e6688)
and inspect the Cloud backend type first. **If it is Lovable Cloud**, use
**Cloud → Database → Backups / SQL editor**, verifying Test vs Live where
applicable. **If it is an external Supabase connection you own**, use that
project's Supabase dashboard instead. Do not assume the pasted CLI command
can access a managed backend. Back up the exact environment before editing.
This document's instructions below assume a Lovable-managed backend.

Run these **read-only** SQL queries in Cloud → SQL editor, and inspect the
result before continuing:

```sql
SELECT
  (SELECT count(*) FROM auth.users) AS auth_accounts,
  (SELECT count(*) FROM public.profiles) AS profiles,
  (SELECT count(*) FROM public.admin_users) AS administrators,
  to_regclass('public.beta_invites') AS invites_table,
  to_regclass('public.beta_invite_redemptions') AS redemptions_table,
  to_regclass('public.username_recovery_codes') AS recovery_table,
  to_regclass('public.username_auth_attempts') AS rate_limit_table,
  to_regprocedure('public.consume_username_recovery_code(uuid,text)') AS recovery_rpc,
  to_regprocedure('public.consume_username_auth_budget(text,text,integer,integer)') AS limit_rpc;
```

```sql
SELECT tgname, pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal
ORDER BY tgname;

SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.nutritional_goals'::regclass AND contype = 'c'
ORDER BY conname;
```

Previously, the live backend had **zero profiles and zero admin accounts**,
and invite/recovery tables did not exist. These are historical observations,
not proof that the state is still unchanged. Recheck manually.

**Stop** if the expected base schema, authentication triggers, or admin
permission system is missing; do not apply a partial migration blindly.

## 2. Prepare database objects, without closing signup yet (owner, manual)

Using the exact committed files on **main** (after this PR merges), review and
apply separately, in a test environment first:

1. `drizzle/migrations/0008_username_recovery.sql`: recovery table and
   single-use redemption RPC.
2. `drizzle/migrations/0009_username_auth_rate_limits.sql`: atomic
   service-role-only request budgets; prevents repeated public guesses.
3. Optional `drizzle/migrations/0007_zero_manual_macro_targets.sql`:
   corrects constraints when a user deliberately chooses zero for a
   manually editable protein/fat goal. First compare actual constraint names.

Do **not** apply `0006_closed_beta_invites.sql` yet. That file installs
a BEFORE INSERT trigger on `auth.users` and **immediately blocks every new
user without a valid invitation**, including direct Auth API requests.
The owner must retain SQL-editor access for bootstrap and rollback.

Verify:

```sql
SELECT
  to_regclass('public.username_recovery_codes') IS NOT NULL AS recovery_ready,
  to_regprocedure('public.consume_username_recovery_code(uuid,text)') IS NOT NULL AS recovery_rpc_ready,
  to_regclass('public.username_auth_attempts') IS NOT NULL AS budget_ready,
  to_regprocedure('public.consume_username_auth_budget(text,text,integer,integer)') IS NOT NULL AS budget_rpc_ready;
```

No raw recovery codes, API keys, passwords or invitation codes should appear
in screenshots, issues, GitHub commits or chat messages.

## 3. Prepare the Edge Functions (owner must initiate if Lovable credits are needed)

The code already exists in `supabase/functions/`:
`username-register`, `username-recovery`, `beta-invites`, plus the new
`_shared/username-rate-limit.ts`. **GitHub sync alone does not prove their
running deployments are current.**

Go to **Cloud → Edge functions** and confirm whether the functions exist and
their live code corresponds to the latest repository code (including the new
rate-limiter). The managed Lovable Cloud interface does not expose a normal
"create Edge Function" button; its documentation directs you to its agent.
If a deployment is needed, **ask the owner to submit the narrow deployment
request in Lovable**, since that can spend Lovable AI credits. Do not send it
on their behalf.

Recommended owner-submitted prompt:

> Deploy the existing GitHub-synced `username-register`,
> `username-recovery`, and `beta-invites` Edge Functions, including the
> `_shared/username-rate-limit.ts` dependency. Do not modify frontend
> screens, invent credentials, change Auth settings, apply migrations,
> enable registration flags, or publish the website. Keep the functions
> disabled unless the owner separately approves activation. Tell me
> exactly which functions you deployed and how JWT checks and gateway
> rate limits are configured. Pause and ask before any additional change.

**Gateway review is mandatory.** The two public handlers must be callable
without a logged-in JWT only through deliberately configured routes.
The privileged `beta-invites` handler always verifies an actual user JWT
and checks `public.admin_users`, even if platform JWT preverification is
disabled. New publishable keys are not JWTs; do not mistake possession of a
publishable key for admin authorization.

## 4. Verify rate limiting and add the server-only rate secret (owner, manual)

In **Cloud → Secrets**, create a cryptographically random secret named
`USERNAME_AUTH_RATE_LIMIT_SECRET` (minimum 32 characters; preferably
32 random bytes encoded as 64 hexadecimal digits). Generate locally, e.g.
`openssl rand -hex 32`, and do **not** paste it into GitHub or this chat.
Lovable automatically provides the reserved `SUPABASE_*` runtime variables;
do **not** overwrite or expose its service-role credential.

The Edge Functions now enforce atomic DB budgets before privileged calls:
- Registration: up to 10 requests per forwarded IP per hour and 6 attempts
  per invitation per hour.
- Recovery: up to 12 requests per forwarded IP per hour and 6 attempts
  per username per day.

The limiter stores only HMAC digests of IP/invite/username values. It does not
make client-supplied forwarding headers trustworthy: separately verify how
Lovable's gateway normalizes and forwards the originating IP and that a
gateway-level protection exists against spoofing and sustained distributed
traffic. **Do not set any `RATE_LIMIT_VERIFIED` flag simply to bypass a 503.**

Check the rate-limit DB RPC exists, that missing/malformed IP forwarding
returns a fail-closed 503, that exceeding the budget produces 429, and that
malformed/unauthorized calls do not create accounts.

Only *after testing* should these verification secrets become `true`:
`USERNAME_REGISTRATION_RATE_LIMIT_VERIFIED` and
`USERNAME_RECOVERY_RATE_LIMIT_VERIFIED`.
The code will continue to reject attempts when any required dependency
is missing or the caller exceeds its budget.

## 5. Close registration and create one private owner invite (owner, manual)

**Only when steps 1–4 are ready**, apply the exact
`drizzle/migrations/0006_closed_beta_invites.sql` in Cloud → SQL editor.
Inspect the resulting `beta_check_before_signup` and
`beta_record_after_signup` triggers on `auth.users`.

Immediately create a **random one-use** invite using the following statement
in the **same Cloud environment**. It generates a new code server-side,
stores only its SHA-256 digest and prints plaintext **once** in the SQL result.
The only person who should ever see it is the owner.

```sql
WITH fresh AS MATERIALIZED (
  SELECT
    'MM-' || upper(substr(
      encode(pg_catalog.sha256(convert_to(
        gen_random_uuid()::text || gen_random_uuid()::text, 'UTF8'
      )), 'hex'), 1, 40
    )) AS secret_code
),
created AS (
  INSERT INTO public.beta_invites
    (code_hash, expires_at, max_uses, note)
  SELECT
    encode(pg_catalog.sha256(convert_to(lower(secret_code), 'UTF8')), 'hex'),
    now() + interval '7 days',
    1,
    'One-use owner bootstrap'
  FROM fresh
  RETURNING id
)
SELECT fresh.secret_code AS one_time_invite, created.id AS invite_id
FROM fresh CROSS JOIN created;
```

Save the returned code somewhere private, then clear the SQL editor/result.
It will be in the exact accepted `MM-[A-F0-9]{40}` format, unlike the
publicly reusable, invalid `MINT-BETA-2026-START` example. Do not publish
or reuse this owner's invitation for other testers.

Verify the trigger rejects a *test* signup with no invitation before enabling
frontend registration. A live project without a staging environment should
not be used for unsafe trial signups.

## 6. Activate only after staging evidence is verified (owner, manual)

Add **backend-only** keys in Cloud → Secrets:

```text
USERNAME_INVITE_TRIGGER_VERIFIED=true
USERNAME_REGISTRATION_RATE_LIMIT_VERIFIED=true
USERNAME_RECOVERY_RATE_LIMIT_VERIFIED=true
USERNAME_REGISTRATION_ENABLED=true
USERNAME_RECOVERY_ENABLED=true
```

Set any verification flag to `true` **only if** the corresponding trigger,
gateway and SQL limiter were actually tested. Do not add `SUPABASE_*` values
manually. Do not expose any server secret in a `VITE_` variable.

Finally, enable these two **frontend build flags** in the checked-in
project `.env` (not in Lovable's Secrets screen):

```dotenv
VITE_USERNAME_AUTH_ENABLED=true
VITE_BETA_INVITES_ENABLED=true
```

Do not activate the frontend before its backend passes the checks.
The username UI cannot be considered live until the owner has personally
verified a new build and republished the site, if necessary.

## 7. Bootstrap the owner account without collecting a personal email

With the private one-use invite, sign up using the **Username**,
**Name**, **Password** and **Invitation** fields at `/register`.
Save all eight offline recovery codes and finish onboarding. The internal
`@macromint.internal` identifier is not a deliverable mailbox.

The code provisions ordinary user data and a time-limited trial, **not
administrator privileges**. To promote the verified owner, inspect the
matching user ID in Cloud SQL:

```sql
SELECT id, email, raw_user_meta_data ->> 'username' AS username
FROM auth.users
WHERE email = lower('REPLACE_WITH_YOUR_ACTUAL_USERNAME') || '@macromint.internal';
```

After verifying this is your *own* account and UUID, run this **separate**
privileged SQL statement, replacing the UUID by the row you verified:

```sql
INSERT INTO public.admin_users (user_id, role)
VALUES ('REPLACE_WITH_VERIFIED_OWNER_UUID'::uuid, 'owner')
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
```

Never promote arbitrary demo accounts, sample IDs or other testers.
Sign out and in again. Verify the owner's Admin view and permission checks
now work. From the deployed `beta-invites` function, issue random,
normally single-use, short-lived invites for additional testers.

## 8. Test in sequence; no production release until each gate passes

1. Existing email-based account (if any) still signs in and can recover
   through its original email path.
2. Username signup works **without any personal email field** and returns
   exactly eight `MMR-` offline codes. The supplied invitation cannot be
   redeemed twice; an invalid or revoked code fails. Direct Auth signups
   without an invite are rejected by the database trigger.
3. An owner signs in, receives the correct role, and can issue and revoke
   invites. A normal tester cannot invoke `beta-invites` or admin endpoints.
4. Username login and offline recovery work. A recovery code can be used
   only once, including under parallel submissions. The user can sign in
   again with the new password. Do **not** share recovery codes in test logs.
5. Registration/recovery rate limits fail closed when unconfigured and
   return 429 when a budget is exhausted; trusted forwarded IP handling
   is verified at the gateway.
6. Onboarding, Today, Diary, Food search, Trends, `/weight`, JSON export,
   diary CSV and weight CSV work with a genuinely signed-in test account.
7. With two different signed-in accounts, cross-user reads/writes must
   fail under actual production RLS. PR #9 tests only the demo adapter.
8. Check mobile browser UX, new-account signup, owner Admin role, backend
   logs, recovery-code errors and service quota monitoring.
9. Only the owner may click **Publish / Update**, after the checks pass.

**Rollback:** If backend activation fails, immediately disable
`USERNAME_REGISTRATION_ENABLED` and `USERNAME_RECOVERY_ENABLED` in Secrets,
then revert the frontend flags to false and rebuild. Disabling the flags
halts new username signup/recovery but **does not automatically undo**
the signup trigger from migration 0006. If emergency open signups are
necessary, review the migration's triggers and backup first; removing the
invite trigger is a separate security decision. Do not erase existing
accounts or migration tables as an improvised rollback.

For security and reliability, the staged activation cannot be proven
complete by GitHub CI alone; it requires database-backed tests and the
owner's explicit release approval.
