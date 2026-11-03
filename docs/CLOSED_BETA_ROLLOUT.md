# Macromint private beta — deployment and verification

This branch adds code. Pushing it does not apply a database migration or deploy an Edge Function. Preserve existing accounts, user data, authentication settings, routes and row level security (RLS). Do not publish until production verification.

## Enrollment

The admin issues a single-use invite. The tester enters name + invitation code, then email + password for a recoverable login. A beta code is an enrollment authorization, never a login credential. There are no guest or anonymous accounts. Existing users and admins continue to sign in normally.

The Supabase Auth BEFORE INSERT database trigger requires an invitation for all new user creations, including direct API signup. It removes the secret code from the stored user metadata and binds the one-time redemption to a new user ID. Max uses are checked atomically in PostgreSQL. Existing user entitlements still follow the existing app settings and trials, normally 14 days. Invite expiry is the deadline to enroll, not trial length.

## Reviewed source files

- drizzle/migrations/0006_closed_beta_invites.sql
- supabase/functions/beta-invites/index.ts
- src/features/auth/Register.tsx
- src/features/admin/Admin.tsx
- src/lib/backend/supabase-backend.ts
- src/lib/auth/remember-me.ts

## Deployment steps requiring owner approval

1. Confirm an existing administrator can log into the live app, and make a recoverable database backup. Do not run the SQL if you lack an existing admin login.
2. Deploy the beta-invites Supabase Edge Function through Lovable Cloud or Supabase before enforcing the migration. The server-side secrets SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for the function and NEVER exposed as VITE_ client environment variables.
3. Test the migration in staging. Then explicitly approve and apply drizzle/migrations/0006_closed_beta_invites.sql to the production Supabase database using its normal migration process. NOTE: once applied, all new registrations without a valid code are rejected.
4. With the existing administrator, create a short-lived, single-use test invitation in the updated /admin interface, copy it, and register a fresh test account with a different email, name and password. Complete email verification and onboarding, log a meal, and confirm the original admin remains signed in.
5. Test repeated code use, revoked and expired codes, concurrent attempted redemptions, signup with no code via the direct Supabase API, and malformed names. Verify code hashes are not readable from a client role, and users cannot read another user's diary.
6. Configure Auth abuse controls, email verification, rate limits and CAPTCHA if supported. Test password reset and remember-me behavior on an actual mobile browser. Review event logs WITHOUT recording invite codes.
7. Run lint, tests, typecheck, build and a real browser walkthrough at 375, 390, 430, 768 and 1440px. Verify mobile keyboard overlays, focus, first-run, loading, error and empty states. Approve and deploy only when successful.

## Risk register

- The SQL applies immediately to every new Supabase Auth user, including any service-role admin-created accounts that do not supply an invite. The existing admin remains unaffected. Back up and stage carefully.
- The registration UI receives a generic error from Supabase if SQL rejects an invalid or used code. Do not leak details about who redeemed an invite.
- Email delivery and link verification require the real Supabase environment; cannot be proven from code review.
- Revoking an invite stops future redemptions only. Revoking an already-registered user's access still uses the existing admin User action.
- Auth signup and server trigger must be deployed together; to temporarily revert closed signup, remove the two beta_* triggers rather than deleting users or data.
- The admin invitation function stores a SHA-256 verifier and shows the raw 160-bit random code only once. Configure rate limits to limit automated attempts.
- Remember me stores session tokens, not passwords; confirm actual browser persistence on mobile and in Lovable preview.
- Existing purchase and rewarded-ad integrations are nonfunctional, and are visibly disabled. Configure billing separately only after approval.
- One optimized, AI-generated food bowl thumbnail is now committed at public/images/food-bowl.webp and displayed with the landing's interactive React portion demo. It is illustrative only, not a real scan result or a true product screenshot; larger editorial image assets could still improve the hero.
- No real browser screenshot or end-to-end live signup verification has been completed in this coding pass. Do not merge until staging proves the enrollment flow and RLS.
