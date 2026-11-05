# Macro Mint: one-batch Edge deployment runbook

**Release status: PREPARED, NOT DEPLOYED.** This document is the source-of-truth
manifest for [#22](https://github.com/usmanbuilds-1/macromint-dashboard/issues/22).
The user's explicit constraint is to spend Lovable Build credits at most once
after all code is merged. This cannot guarantee that a live provider/runtime
failure will never require a corrective deploy. Never bypass security to avoid
a second credit charge.

## 0. Verified baseline and intentional boundaries

- `0006_closed_beta_invites.sql` and `0007`–`0009` are already installed in
  live Cloud; do **not** run them again. Migration `0006` installed the BEFORE
  INSERT invite gate and AFTER INSERT redemption tracker on `auth.users`.
- The original invite leaked in a chat and was revoked; a separate private,
  unredeemed invitation exists. Do not disclose it in prompts/screenshots.
- `USERNAME_AUTH_RATE_LIMIT_SECRET` and `GEMINI_API_KEY` are stored privately.
  Confirm presence by **name only**, never expose values.
- `username-register` and `username-recovery` were deployed from PR #20 but
  **not** updated with shared rate-limiter hardening from PR #21.
- Main's frontend registration flags and backend activation flags remain OFF;
  no account/owner exists at last live check. Gateway and RLS cross-user
  tests still require live controlled accounts.
- Static CI and SQL migration existence are **not** proof that the Cloud runtime,
  client IP forwarding, payment or advertising providers work.

## 1. Before deploying functions: three NEW additive Cloud SQL migrations

**Owner must verify same production/staging database and take a restorable
backup before applying anything.** Lovable's assistant must not silently
apply migrations during the Edge deployment request.

Run the exact, final-merged versions in the Cloud SQL editor **in order**:

1. [`0010_ai_scan_atomic_budgets.sql`](../drizzle/migrations/0010_ai_scan_atomic_budgets.sql):
   tables and service-role RPC `consume_ai_scan_budget(uuid)`. Adds atomic
   UTC-fixed scan-attempt limits (6/minute, 40/day), counts failed provider
   calls after validation. No raw photo data stored. Must exist before
   deploying the updated `ai-scan` handler, otherwise scans fail closed 503.
2. [`0011_atomic_admin_actions.sql`](../drizzle/migrations/0011_atomic_admin_actions.sql):
   `admin_change_entitlement(uuid,uuid,text,integer,text,text,text,text)`
   and `admin_set_app_config(uuid,text,integer,numeric,integer,text)`.
   Updates and mandatory audit rows happen within the same DB transaction.
   Required by the new `admin-action` handler.
3. [`0012_atomic_beta_invites.sql`](../drizzle/migrations/0012_atomic_beta_invites.sql):
   `admin_create_beta_invite(uuid,text,timestamptz,integer,text)` and
   `admin_revoke_beta_invite(uuid,uuid)`. Required by the new
   `beta-invites` handler. Existing owner invite remains untouched.

After applying, verify with **read-only** SQL:

```sql
SELECT
  to_regclass('public.ai_scan_attempt_budgets') IS NOT NULL AS scan_budgets_ready,
  to_regprocedure('public.consume_ai_scan_budget(uuid)') IS NOT NULL AS scan_rpc_ready,
  to_regprocedure('public.admin_change_entitlement(uuid,uuid,text,integer,text,text,text,text)') IS NOT NULL AS audited_access_ready,
  to_regprocedure('public.admin_set_app_config(uuid,text,integer,numeric,integer,text)') IS NOT NULL AS audited_config_ready,
  to_regprocedure('public.admin_create_beta_invite(uuid,text,timestamptz,integer,text)') IS NOT NULL AS audited_invites_ready,
  to_regprocedure('public.admin_revoke_beta_invite(uuid,uuid)') IS NOT NULL AS audited_revoke_ready;
```

Every column must be `true`. Additionally, verify the RPCs are not
executable by `anon` or `authenticated`, and the new quota table has RLS
enabled. These checks alone do not validate runtime semantics; real-account
tests remain required.

**Rollback plan:** Keep an actual backup; if a migration fails, do not deploy
dependent Edge functions. The functions must never be enabled to work around a
failed RPC. Restoring data or reverting a function requires explicit review.

## 2. Final source manifest and deployment candidates

Target: existing Lovable project `faa9bf14-f641-4129-94e2-d944468e6688`.
Freeze an immutable **GitHub main SHA** only after PR CI passes; never use an
unreviewed Lovable AI rewrite or a stale local folder.

The complete existing Edge-function inventory (eight functions):

| Function | Source | Release notes |
|---|---|---|
| `username-register` | `supabase/functions/username-register/index.ts` | Depends on validated IP budgets, invite gate, recovery table. Keep disabled until activation. |
| `username-recovery` | `supabase/functions/username-recovery/index.ts` | Depends on validated IP budgets and one-time recovery RPC. Keep disabled until activation. |
| `beta-invites` | `supabase/functions/beta-invites/index.ts` | Uses NEW audited invite SQL RPCs; admin JWT/role required. |
| `admin-action` | `supabase/functions/admin-action/index.ts` | Uses NEW atomic audited config/access SQL RPCs; admin JWT/role required. |
| `admin-query` | `supabase/functions/admin-query/index.ts` | Hardened search and missing-data behavior; admin JWT/role required. |
| `ai-scan` | `supabase/functions/ai-scan/index.ts` | Gemini-first, validated photo, timeouts and NEW atomic quota RPC. Requires real user access. |
| `food-search` | `supabase/functions/food-search/index.ts` | FIX: reads the POST JSON sent by the frontend; validates and time-limits OFF requests. |
| `delete-account` | `supabase/functions/delete-account/index.ts` | Keep existing authenticated deletion behavior; confirm cleanup/retention with real account. |

Shared dependencies:
- `supabase/functions/_shared/http.ts`
- `supabase/functions/_shared/username-rate-limit.ts` (PR #21, cannot trust
  caller-supplied XFF; requires trustworthy proxy-populated `CF-Connecting-IP`).

Known gateway config in repository: `verify_jwt=false` on public auth handlers
and other deployed function routes in `supabase/config.toml`.
**This does NOT make admin, scanning, or deletion endpoints public: those
handlers independently validate the bearer JWT and access/role.**
Verify the actual live gateway configuration matches the audited code.

## 3. Secret and environment names (never show values)

Server: `GEMINI_API_KEY`, `USERNAME_AUTH_RATE_LIMIT_SECRET`, Supabase's
reserved `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`. Provider-selection optional:
`AI_VISION_PROVIDER`; defaults to `gemini`. It must be explicitly set to
`lovable` or `openai` to use potentially paid alternative providers.
No production checkout or rewarded-ad provider credentials are configured.

Do not enable these while deploying:
`USERNAME_REGISTRATION_ENABLED`, `USERNAME_RECOVERY_ENABLED`,
`USERNAME_INVITE_TRIGGER_VERIFIED`,
`USERNAME_REGISTRATION_RATE_LIMIT_VERIFIED`,
`USERNAME_RECOVERY_RATE_LIMIT_VERIFIED`.

Frontend build-time flags (not secrets): `VITE_USERNAME_AUTH_ENABLED`,
`VITE_BETA_INVITES_ENABLED`. Keep disabled until server-side checks pass.
Changing these requires an actual frontend rebuild, not merely saving a
backend secret.

## 4. ONE final Lovable Build-mode deployment request

**ONLY AFTER** all three SQL checks above pass, final main SHA and GitHub CI
are captured, and the owner approves this exact deployment plan:

> Deploy the existing eight Macromint Supabase Edge Functions in **one
> single deployment pass**, from GitHub main at commit
> `REPLACE_WITH_CI_GREEN_FINAL_MAIN_SHA`. Use the exact committed source for:
> `username-register`, `username-recovery`, `beta-invites`,
> `admin-action`, `admin-query`, `ai-scan`, `food-search`,
> `delete-account`, including `_shared/http.ts` and
> `_shared/username-rate-limit.ts`. Do not rewrite, regenerate or invent
> any code. The necessary SQL migrations 0010–0012 have been separately
> applied and verified by the owner. No SQL migrations, database writes,
> source changes, frontend redesign, secret changes, activation-flag changes,
> new keys, account creation, public publishing or deploy retries without
> explicit owner approval. Preserve existing JWT route configuration, and
> verify handler-level authentication remains mandatory on all protected
> routes. Keep username registration and recovery disabled. Return one
> per-function table with deployed name, exact source SHA/bundle hash,
> gateway auth configuration, boot/runtime errors and relevant safe
> unauthenticated HTTP status. Never reveal or log secret values, invitation
> codes, recovery codes, client IPs or user records. **Stop** if an expected
> SQL function is absent or any bundle cannot deploy; identify the blocker
> without silently changing backend security settings.

Update the immutable SHA placeholder **after merge**. Do not send this
Build-mode prompt from ChatGPT (user controls credit spending).

## 5. After deploying: activation and acceptance

1. Confirm source hashes per function and disabled `503` behavior for
   username register/recovery, `401` unauthenticated for admin/invites/
   delete/scan/search as appropriate. 503 only proves the outer guard.
2. Verify trusted reverse proxy overwrites any forged `CF-Connecting-IP`
   for public Edge endpoints; ensure there is no origin/bypass path. Inspect
   sanitized gateway logs and test from a separate disposable client; do
   not expose identifying addresses. If trust cannot be proven, do not
   enable public username registration.
3. In a controlled environment, activate only verified backend flags.
   Test valid/invalid invite calls, 429 IP/identifier budgets, 503 missing
   header fail-closed, one-time use and expiry; ensure no user is created
   on rejected requests.
4. Enable the two frontend VITE flags **only when backend is ready**; build
   and verify the private `/register` form. This is separate from the
   Edge deployment and from publishing.
5. Register owner from private one-use invite, save 8 recovery codes offline;
   verify exact auth UUID in SQL and promote only that account to owner.
6. Test owner admin list/permissions/invitations/trials and the nonadmin
   denial path, including audited rollback on failed writes.
7. Run real two-user end-to-end/RLS tests, scans including 6/min and 40/day,
   photo type and quota failures, food barcode/search, onboarding, diary,
   goals, trends, exports, deletion and recovery. Never use real owner
   recovery codes for destructive test cases.
8. Paid subscriptions and rewarded ads remain unavailable until actual
   merchant/provider accounts, webhook signature validation, receipts and
   policy-compliant reward verification are implemented. Do not fake
   fulfillment or production revenue.
9. Review privacy notice, account deletion/trial ledger retention,
   legal terms, monitoring, logs, backups and published-site design signoff.
   Publishing is done only by the owner.

## Deployment QA evidence ledger

- [ ] SQL 0010–0012 applied to intended Cloud database; read-only verification all six true.
- [ ] GitHub CI success and immutable main SHA captured.
- [ ] Owner approved one-shot Build-mode prompt.
- [ ] Eight serverless bundles installed from exact SHA with no unsupported changes.
- [ ] Trusted proxy IP forwarding verified; rate limiting 429 observed.
- [ ] Private invitation and signup completed; owner role assigned to verified UUID.
- [ ] Cross-account security, recovery, scanning, deletion and admin audit tests passed.
- [ ] Commercial features gated honestly; UI signed off and user publishes.
