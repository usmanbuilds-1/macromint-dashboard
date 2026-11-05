# Pre-deployment security and commercial readiness

**Status:** PREDEPLOY CHECKS PREPARED, not live security certification or completed payments. Owner requires one final Lovable Edge deployment. Avoid spending Lovable credits until the code, migrations and the provider decision are frozen.

## What can and cannot be proven before deploying

| Test | Predeploy | Requires deployed and/or enabled runtime |
| --- | --- | --- |
| Review RLS policies, signup triggers, function grants, table data | **Yes**: read-only SQL; current user count is zero | Real cross-user proof |
| Verify atomic DB limiter in isolation | **Yes**: performed previously with transaction rollback | E2E 429 and trusted source-IP identity |
| Check handler code, flags, image parser, signup/recovery validation | **Yes**: GitHub CI, fixtures, static and mock tests | Runtime secrets and provider integration |
| Confirm two Edge handlers are reachable and disabled | **Yes**: prior live 503 from PR #20 | Full PR #21 trusted-IP limiter and new PR #23 bundles |
| Spoof header and observe real limiter | **No**: disabled 503 returns before limiter | **Yes**: after updated shared limiter deploy, a trustworthy/proxy-documented source-IP path and controlled probes |
| Owner signup, recovery codes, admin role, invite reuse | **No**: 0 users and disabled registration | **Yes**: after registration activation |
| Real authenticated user A/B RLS, admin denial, food search, scan quota | Code/test preparation only | **Yes**: after users and latest functions exist |
| Subscription payments and AdSense payouts | Provider research and code architecture only | Sandbox merchant credentials, approved accounts, signed webhooks, then live approval |

### Existing live evidence (2026-11-05)

- User count 0; admin count 0. Migration 0006 installed with before/after signup invite triggers. One private, unredeemed invite; exposed code revoked.
- `username-register` and `username-recovery` still return disabled 503 from the older PR #20 bundles. New PR #21 source-IP helper not deployed.
- New additive migrations `0010` (scan quotas), `0011` (atomic admin operations) and `0012` (atomic invite operations) are **NOT installed**. Deploying the dependent new handlers first will cause fail-closed errors.
- The existing registered-user database queries cannot demonstrate RLS across two identities because no real users are present.

## Prepared real-account security harness

Run `node --check scripts/live-auth-security-audit.mjs` during CI. Live runtime script requires two **disposable** test identities, not the owner. Supply credentials via local environment/CI secrets, **never** prompts or source control:

```sh
E2E_SUPABASE_URL=https://YOUR-OWN-CLOUD-HOST \
E2E_SUPABASE_ANON_KEY=REDACTED \
E2E_USER_A_USERNAME=DISPOSABLE_A \
E2E_USER_A_PASSWORD=REDACTED \
E2E_USER_B_USERNAME=DISPOSABLE_B \
E2E_USER_B_PASSWORD=REDACTED \
node scripts/live-auth-security-audit.mjs
```

The env values above are placeholders, not real credentials. The script:
- signs in as distinct username-only test accounts
- tests cross-user SELECT denial on profiles, entitlements, water, weight, diary
- verifies normal test users cannot call admin-query or list beta invitations
- checks authenticated food search accepts the UI's JSON POST and returns arrays
- optionally tests a **positive-control write**: with `E2E_ALLOW_PROBE_WRITES=true`, account B inserts one small water-entry fixture, reads it as B, tries to read/update as A, and cleans it up via B
- explicitly doesn't log JWTs/passwords or perform paid scan calls
- fails closed (red) on any access disclosure; no fake PASS without real accounts

For legitimate live rate-limit tests, use disposable environments, **never brute-force** public credentials; rely on sanitized gateway logs and expected `429` when the tested identifier budget exhausts. Check that a forged incoming `CF-Connecting-IP` cannot change the trusted client identity. The managed ingress must strip/overwrite it and prevent direct-origin bypass; the current Edge parser cannot prove that contract on its own.

## Commercial decisions: Pakistan-based operator, 2026-11-05

### Payment: Safepay as recommended candidate (NOT CONNECTED)

Official resources:
- https://safepay.pk/
- https://apidocs.getsafepay.com/
- https://safepay-docs.netlify.app/build-your-integration/subscriptions/
- https://safepay-docs.netlify.app/developers/webhooks/overview/
- https://safepay-docs.netlify.app/developers/safepay/api-keys/

Safepay documents Pakistan-friendly hosted checkout, recurring subscriptions, sandbox, distinct test/live API credentials, and HMAC-signed webhook processing. A merchant must first create sandbox and then obtain merchant approval for production. This is a recommended provider choice, **not an established integration**. Confirm available currencies/recurring methods, exact fees, account eligibility and plan economics with Safepay. Stripe does not list Pakistan for direct domestic merchant onboarding: https://stripe.com/global .

Suggested architecture **after the owner selects Safepay**:
1. A server-only `payments-create-checkout` requires authenticated JWT + own account, server-selected approved plan/price/currency, idempotency, and a private checkout session. Do NOT trust price from browser.
2. Hosted checkout returns to the app but its redirect **never** changes entitlements.
3. Server-only `payments-webhook` verifies Safepay's *raw-body HMAC*, checks the event ID for idempotency, correlates payment/subscription to an internal account, verifies amount/currency/status, and atomically updates entitlements and payment/audit records.
4. Process created/succeeded/failed/cancelled/refunded events; account access changes only on authenticated provider status, never client callbacks.
5. Add cancellation, failed payment, renewal grace, refund/chargeback, webhook retries, and reconciliation with tests.
6. Sandbox first; replace with live secrets **only after merchant onboarding**. No API key in public VITE variables, chat or GitHub.

**Do not implement/sign webhooks from guessed docs or pretend to charge customers without sandbox credentials.** Existing `payments`/`subscriptions` tables are only scaffolding; user-facing purchase UI remains disabled.

### Advertising: distinguish site content unlock from account entitlement

Official Google resources:
- https://support.google.com/adsense/answer/13402307?hl=en (Pakistan is eligible for AdSense applications)
- https://support.google.com/adsense/answer/12726063?hl=en (Offerwall rewarded ad unlocks **site content**)
- https://support.google.com/adsense/answer/13865318?hl=en (Offerwall is page-meters/site-access UX)

Google AdSense Offerwall may show a rewarded ad and let a visitor access metered pages without an app code change. However this is **not** evidence that a specific signed-in Macro Mint account has earned 24 hours of authenticated subscription entitlement. Do not grant DB privileges from client events, page access, or ad-view claims. Google may suppress an Offerwall if no ad inventory is available. Publisher approval/website acceptance is required.

For user-requested **24-hour account unlock after watching an ad**, require an ad provider with documented server-to-server reward attestation bound to account + nonce, replay protection and reward-granting backend integration; verify policies and availability before introducing a new Edge endpoint. Otherwise keep the rewarded account-access feature disabled. AdSense Offerwall can still be evaluated separately for legitimate content metering, but not as a billing substitute.

### User-only actions needed to finish commerce

- Open/verify Safepay **sandbox merchant** account; then confirm production eligibility, subscription support, pricing and supported payment rails.
- Open/verify AdSense publisher account and **approved real website**; decide whether a page Offerwall is wanted, or insist on a separate ad provider with verifiable per-account rewards.
- Set approved pricing, trial duration, refund/cancellation policy and target currencies. Do not invent the user's business choices.
- Save provider credentials in Cloud Secrets via supported private UI. Never paste values into this chat or a Lovable AI prompt.
- Provider webhooks, website ownership and KYC must be completed in the provider's own console.

## Deployment order and freeze rule

1. Keep the existing 0006-0009 installed. Owner ensures backups; applies/validates 0010-0012 manually (see `docs/ONE_SHOT_EDGE_RELEASE.md`).
2. Decide if Safepay and authenticated rewarded ads are in first release. If yes, finish sandbox integration/tests and add actual payment/ad Edge handlers before **freezing** main. If not, leave UI explicitly disabled, and do not delay closed beta.
3. Run GitHub CI and `node --check scripts/live-auth-security-audit.mjs`, freeze exact main SHA.
4. One Lovable Build-mode redeploy, no automatic enablement/publishing.
5. Run verified live header/IP, registration, recovery, admin, RLS, AI scan and food search tests (script above).
6. Only open beta/publish when evidence is green and the owner approves.

**Non-negotiable:** Full live security sign-off cannot be moved before the very Edge deployment it is intended to verify. Claiming otherwise would be a false security assurance.
