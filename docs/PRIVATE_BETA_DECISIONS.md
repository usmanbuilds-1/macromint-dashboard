# Private-beta decision record

Grill with Docs rounds 1–2 — owner answers received 2026-11-05. This document tracks decisions, observed source gaps, and unresolved tradeoffs. Do not treat this file or green CI as production activation.

## Resolved decisions

1. **Invited testers are not automatically complimentary.** They enter the ordinary trial. The live Cloud setting was read as `trial_days = 14` on 2026-11-05; that duration was observed rather than newly chosen during the interview.
2. **Only the verified owner initially governs invitations, account entitlements and platform settings.** No one becomes owner through an invitation or chosen username.
3. **Username account recovery remains offline-code based.** Eight single-use backup codes are the only automated recovery mechanism. No unchecked admin-reset shortcut.
4. **AI scanning limits remain 6 eligible attempts/minute and 40/day/account.** Admin needs operational visibility into usage and failures; existence of a dashboard has not yet been verified.
5. **Trial expiry signs the tester out.** The owner rejected the suggested keep-signed-in view/export mode. Preserve data; do not infer that the owner agreed to deny deletion/export permanently.
6. **Invitations are single-use and normally expire after seven days.** Successfully redeemed invitations cannot be reused. If registration creates an account but recovery setup fails, use a fresh invitation rather than reactivating the consumed one.
7. **Owner revocation signs the tester out.** All protected database/API operations must fail immediately for a revoked entitlement, without deleting diary history. Remote multi-device sign-out latency must be verified, not assumed.
8. **Password recovery requires fresh sign-in and terminates other sessions wherever possible.** Verify real provider behavior; existing access JWTs may remain valid until expiry.

## Source/code alignment findings

- `supabase/functions/beta-invites/index.ts` and `supabase/functions/admin-action/index.ts` inspect `admin_users` but do not themselves require `role = 'owner'`. This differs from the approved owner-only governance policy. Add server-level role controls, verify RPC permissions, test with non-owner admin.
- `drizzle/migrations/0006_closed_beta_invites.sql` uses an atomic one-time redemption; `username-register` deletes a partially-created account if recovery-code storage fails. The script makes no promise of reusing a consumed invite. The `beta-invites` server handler currently defaults invitation validity to 14 days, so a seven-day default requires an intentional change.
- `src/context/Session.tsx` and `src/routes/_app.tsx` currently redirect expired/revoked users to `/upgrade` while retaining the authenticated session. This **does not match** the signed-out policy. `src/features/upgrade/Upgrade.tsx` shows payment checkout as unavailable during private beta.
- `src/context/Session.tsx` computes access in the UI, while SQL `has_access()` independently gates user data; no verified remote session termination exists. Need to handle expiration across tabs/devices, backgrounded sessions, and existing JWTs.
- `supabase/functions/username-recovery/index.ts` consumes a one-time code and updates the password, but does not visibly revoke other sessions; its comment flags previous JWT survival. Verify Supabase session revocation and prevent indefinite stale-session access.
- The scan-budget infrastructure exists. Owner visibility into attempts and failures has not been verified.

## Frontier for round 3 — decisions, not facts

- If expiry logs the tester out but no payment provider is available, should they be allowed to authenticate into a **restricted account-only** area to request reactivation and export/delete their data, while logging/scanning remain blocked?
- When the owner restores an account's access, can the tester simply sign in again with existing credentials, or must they use a new invitation?
- Do trial expiry and revocation demand sign-out on **every device**, as soon as a device connects/refreshes, with immediate backend access denial even when an existing JWT is still unexpired?

## Release controls

- Documentation PR is draft and not merged. No backend deploy, flags, account creation, owner promotion or publication is performed by editing this record.
- Before activation, server role controls, invitation safeguards, source parity, source-IP anti-spoofing, client/session behavior and data RLS must be tested in actual infrastructure.
