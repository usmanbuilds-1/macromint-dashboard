# Private-beta decision record

Grill with Docs rounds 1–5 — owner answers received 2026-11-05. This document tracks decisions, observed source gaps, and unresolved tradeoffs. Do not treat this file or green CI as production activation.

## Resolved decisions

1. **Invited testers are not automatically complimentary.** They enter the ordinary trial. The live Cloud setting was read as `trial_days = 14` on 2026-11-05; that duration was observed rather than newly chosen during the interview.
2. **Only the verified owner initially governs invitations, account entitlements and platform settings.** No one becomes owner through an invitation or chosen username.
3. **Username account recovery remains offline-code based.** Eight single-use backup codes are the only automated recovery mechanism. No unchecked admin-reset shortcut.
4. **AI scanning limits remain 6 eligible attempts/minute and 40/day/account.** Admin needs operational visibility into usage and failures; existence of a dashboard has not yet been verified.
5. **Trial expiry signs the tester out.** The owner rejected the suggested keep-signed-in view/export mode. Preserve data; do not infer that the owner agreed to deny deletion/export permanently.
6. **Invitations are single-use and normally expire after seven days.** Successfully redeemed invitations cannot be reused. If registration creates an account but recovery setup fails, use a fresh invitation rather than reactivating the consumed one.
7. **Owner revocation signs the tester out.** All protected database/API operations must fail immediately for a revoked entitlement, without deleting diary history. Remote multi-device sign-out latency must be verified, not assumed.
8. **Password recovery requires fresh sign-in and terminates other sessions wherever possible.** Verify real provider behavior; existing access JWTs may remain valid until expiry.
9. **Expired accounts can sign back in to a restricted account-only area** for data export, deletion and a reactivation request, without being allowed to create food logs or use AI scanning. No automatic extension or new trial is granted.
10. **Restoring access does not require another invitation or account.** The user signs in with their existing username and password once the owner restores their entitlement.
11. **Expiry/revocation must sign users out on every device as each connects/refreshes**, with *immediate* server-side denial of protected operations even when a device retains a valid JWT. Immediate remote client UI logout is not guaranteed for offline devices.
12. **Revoked users also keep restricted account privacy rights**, including exporting or deleting their own data. Revoke product access, not ownership of personal data. This does not restore tracking privileges.
13. **Reactivation requests go into a private owner-only Admin queue**. Users may request but only the verified owner can decide and grant access. No automatic extension or grant.
14. **Owner administration does not expire with the owner's product trial**. The verified owner must still be able to sign in to manage users, invitations, settings and requests; that administrative capability is not a blanket bypass of paid tracking entitlement.
15. **Full data export is available strictly on user request**, including after expiry/revocation; no automatic export or email of user data. Export the user's own records completely, excluding other accounts' data, security secrets and recovery-code hashes. User-initiated deletion remains separate.
16. **Revoked and suspended users may submit a reactivation appeal.** Submission never restores access; the verified owner chooses whether to grant it.
17. **Only one pending reactivation request per account.** The requester can view their own request status. Duplicate submissions must not create parallel pending cases or consume owner attention.
18. **An approved extension takes effect at the time the owner approves it, even if the user is offline.** It is not delayed until a subsequent login. Existing trial-extension SQL extends an active unexpired trial from its current scheduled end and an expired one from approval time; if this distinction changes, it requires an explicit product decision.
19. **Every owner approval, denial, suspension and access restoration requires a recorded reason** in the private administrative audit. An action with an empty/whitespace-only reason must fail before any state change; decision logging and mutation must be atomic.

## Source/code alignment findings

- `supabase/functions/beta-invites/index.ts` and `supabase/functions/admin-action/index.ts` inspect `admin_users` but do not themselves require `role = 'owner'`. This differs from the approved owner-only governance policy. Add server-level role controls, verify RPC permissions, test with non-owner admin.
- `drizzle/migrations/0006_closed_beta_invites.sql` uses an atomic one-time redemption; `username-register` deletes a partially-created account if recovery-code storage fails. The script makes no promise of reusing a consumed invite. The `beta-invites` server handler currently defaults invitation validity to 14 days, so a seven-day default requires an intentional change.
- `src/context/Session.tsx` and `src/routes/_app.tsx` currently redirect expired/revoked users to `/upgrade` while retaining the authenticated session. This **does not match** the signed-out policy. `src/features/upgrade/Upgrade.tsx` shows payment checkout as unavailable during private beta.
- `src/context/Session.tsx` computes access in the UI, while SQL `has_access()` independently gates user data; no verified remote session termination exists. Need to handle expiration across tabs/devices, backgrounded sessions, and existing JWTs.
- `src/lib/backend/supabase-backend.ts:exportAllData` uses the caller's RLS scope. The diary, weight and other data SELECT policies in `0002_macromint_0003_rls.sql` require `has_access()`. A restricted expired-account export will silently lose required collections or fail without a narrowly scoped owner-only export mechanism that does not restore full premium reads. Test completeness, isolation and privacy.
- `src/features/settings/Settings.tsx` only exposes export/delete inside the regular authenticated app; `src/features/upgrade/Upgrade.tsx` remains signed in and has no restricted account controls. They need a distinct, reachable post-expiry flow.
- `supabase/functions/delete-account/index.ts` validates an authenticated token without requiring active product access; this is compatible with Q9 but needs route/UI access and real-account testing.
- Restoration should update entitlement only, with no new invite redemption and no new trial; sign-in with existing credentials must remain possible.
- The approved owner queue does not exist in the inspected `admin-query` or `admin-action` handlers: no user-facing reactivation submission, queue status, owner decision notification or queue audit has been verified. Design server-side ownership, status changes, rate limits and authorization; do not mistake existing audit logs for a request queue.
- The current `src/routes/_app.tsx` requires active entitlement before reaching nested Admin routes. The owner can be redirected to `/upgrade` after trial expiry even though Q14 requires persistent administration. Separate owner-admin access from product entitlement while continuing server-side role checks.
- Full export is presently initiated from `src/features/settings/Settings.tsx`, so it is user initiated already, but the route and RLS block expired/revoked accounts. Do not auto-create or auto-send files in the future; require a deliberate authenticated export action.
- `supabase/functions/username-recovery/index.ts` consumes a one-time code and updates the password, but does not visibly revoke other sessions; its comment flags previous JWT survival. Verify Supabase session revocation and prevent indefinite stale-session access.
- The scan-budget infrastructure exists. Owner visibility into attempts and failures has not been verified.
- Reactivation request storage, one-pending-request constraint, requester-visible status and owner-only accept/deny handling have **not** been implemented. A database-level unique pending constraint and authenticated user ownership checks are needed; UI-only deduplication is insufficient.
- In `drizzle/migrations/0011_atomic_admin_actions.sql`, `admin_change_entitlement` accepts `p_reason` as nullable and checks maximum length but does not require nonempty reasons. `supabase/functions/admin-action/index.ts` similarly treats `reason` as optional. These must change for the four explicitly protected decision types. The signed-off policy extends to denial decisions introduced by the new queue.
- The existing SQL `extend_trial` computes `greatest(old_record.trial_ends_at, now()) + interval`, so an expired account extension begins from approval-time and does not wait for login. For an *active* trial it adds time to the existing scheduled end; do not silently redefine this behavior.

## Frontier for round 6 — decisions, not facts

- When an owner denies a reactivation request, should the requester see only a neutral status (`Denied`) and an optional public-facing explanation, while private audit reasons stay owner-only?
- Should users with a denied request have a fixed cooldown before opening another, rather than immediately spamming a new pending request? If yes, decide the interval rather than inventing one.
- Should deleting an account require recent password reauthentication (or another secure fresh-auth proof), rather than just clicking Delete on a session that may have been left open?
- Should the platform prevent deletion, suspension or demotion of its **last verified owner** until another trusted owner has been promoted, avoiding an unadministrable system?
- For reactivation approvals, should the owner choose the exact extension length (for example 7, 14 or 30 days) rather than applying a fixed entitlement automatically?

## Release controls

- Documentation PR is draft and not merged. No backend deploy, flags, account creation, owner promotion or publication is performed by editing this record.
- Before activation, server role controls, invitation safeguards, source parity, source-IP anti-spoofing, client/session behavior and data RLS must be tested in actual infrastructure.
