# Private-beta decision record

Grill with Docs round 1 — owner answers received 2026-11-05. This document tracks decisions, observed source gaps, and the next round's unresolved tradeoffs. Do not treat this file or green CI as production activation.

## Resolved decisions

1. **Invited testers are not automatically complimentary.** They enter the ordinary trial. The existing Cloud setting was read as `trial_days = 14` on 2026-11-05; the trial duration has not been newly decided in this interview.
2. **Only the verified owner initially governs invitations, account entitlements and platform settings.** No user can promote themselves based on having an invitation or an arbitrary chosen username.
3. **Username account recovery remains offline-code based.** Eight single-use backup codes are the only automated recovery mechanism. No unchecked admin-reset shortcut.
4. **AI scanning limits remain 6 eligible attempts/minute and 40/day/account.** Admin needs operational visibility into usage and failures; the visibility requirement is not yet verified implemented.

## Observed implementation differences

- `supabase/functions/beta-invites/index.ts` and `supabase/functions/admin-action/index.ts` read `admin_users` but do not themselves require `role = 'owner'`. Enforce approved role scope in server handlers and/or transaction-backed RPCs before any additional administrative roles are issued; test with a non-owner admin fixture. Ordinary users must remain denied.
- The current RLS rules gate many user data queries on `has_access`. This can affect whether an expired tester can retrieve or export their own history; decide the product rule before changing it.
- `username-recovery` consumes a code atomically and updates the password, but the code explicitly notes that previous JWTs may stay valid until expiry. Define session-invalidation behavior and verify it with live Auth.
- The server scan budget exists. A real owner-facing usage and failure dashboard has not been verified. Do not claim it shipped solely because quotas do.

## Next unresolved questions (do not implement until settled)

- On trial expiration with no live payment provider, what must remain accessible (sign-in, history, export, deletion), and what must stop (new logs/scans)?
- Should invitation codes always be single-use and short-lived, including after failed registrations?
- Should owner revocation terminate an existing authenticated session immediately, or only block protected reads/writes?
- Should password recovery invalidate all previously issued sessions, subject to the auth provider's actual revocation semantics?

## Release controls

- Source/CI preparation may continue without claiming the private beta is live.
- Server-side role authorization, signup triggers, account-specific scan budgets and data RLS must be tested in actual deployed infrastructure.
- Changing account-access flags, deploying Edge handlers and publishing are operational steps separate from these recorded decisions.
