# Macro Mint release-gap closure — Grill with Docs review

## Grounding

Reviewed GitHub source, existing release documentation, database RLS policies, authentication UX and nutrition behavior. This review adopts the source-first questioning, shared vocabulary and ADR discipline of Matt Pocock's Grill with Docs workflow. The upstream skill ordinarily requests an interview before executing; because the owner requested implementation and deployment together, factual questions were resolved from the repository, reversible UX choices use conservative defaults, and any account/provider decision not answerable from code is explicitly **blocked**, not guessed.

## Design tree and challenges

1. **What does “deploy” mean?** A green PR is not the live Cloud deployment. Source merge, Lovable website publish, SQL migration, and Edge Function release are four different actions. Do not silently conflate them.
2. **What is a Favorite?** A reusable food record, not a past diary entry. Remote and AI-only foods have no local food ID; explicitly save them as account-owned custom food with source/uncertainty retained before favoriting. Never publish new foods globally.
3. **What is a Saved meal?** A named template of the amount consumed. Preserve fractions and permit rename/delete and reuse. Existing diary records must not mutate.
4. **What counts as correct nutrition?** Correct arithmetic does not guarantee correct underlying nutrient values. Unknown must remain unknown; adherence and target comparisons should use only complete days.
5. **Which credentials can be recovered?** Username-only signup currently hides recovery codes, while the reset screen requires one; this is a self-service dead end. The server's recovery mechanism must be verified before presenting codes. Avoid insecure identity-guessing or administrator bypass.
6. **Can an ad/payment unlock accounts?** Not without signed, authenticated provider confirmations and approved merchant/advertising accounts. Never infer paid or rewarded entitlements from client events.
7. **Is the browser test enough?** No. Android IME behavior, Safari visual viewport and live RLS across two users require separate operational checks.
8. **What happens on slow networks?** Cache reads are account-scoped, stale requests must not cross account boundaries; measure Today view with warm/cold navigation, search and keyboard transitions.
9. **Where are architectural hotspots?** Large backend adapters and global CSS remain. Extract bounded helpers rather than adding new unrelated responsibilities to either.

## Implementation/release tracks

| Track | Source work | Test gate | Operations gate |
| --- | --- | --- | --- |
| A — Input and log accuracy | PR #50: viewport-aware dialogs, favorites, portion accuracy, null handling | Unit, typecheck, mobile browser smoke | Android real keyboard |
| B — Food reuse | Persist remote/AI items as private custom food, saved-meal management, direct reuse | Demo + Supabase contract tests; RLS validation | Two-user live RLS |
| C — Login reliability | Restore backup-code onboarding and clear recovery instructions without exposing codes in telemetry | UI + edge negative paths | Deployed username handlers and trusted ingress |
| D — Scalability | Shared helpers, smaller modules, route/load measurement tests | Bundle, types, navigation screenshots | Field measurements |
| E — Monetization | Document merchant/ad adapters and fail-closed entitlement strategy | Server-side attestation tests once provider chosen | Merchant KYC, keys, approved domains and signed webhooks |

## Hard blockers before production activation

- SQL migration inventory, database backup and one-time application of any missing 0010–0016 migrations; no migration can be assumed present.
- Lovable Cloud's ten Edge bundles must be deployed to the matching backend and their feature flags revalidated.
- Positive-control regular signup, invited signup, recovery, admin denial, two-user RLS, quota enforcement, data export and deletion must pass with disposable accounts.
- Real device Android IME and iOS Safari keyboard tests must confirm overlay and focus.
- A payment processor, subscription rules, AdSense approval and a verifiable reward provider must be selected and set up before paid/rewarded account unlocks are enabled.

## No-guess decisions

- Payment vendor, pricing, trial extension policy, refund periods, ad reward validity and published domain ownership require the operator's provider accounts. Keep existing plans visible only where clearly marked unavailable, not as working checkout.
- Never collect a recovery code, database password, service key or financial secret in a repository doc or user-facing error.
- Preserve all account data and historical foods; use additive migrations only when owner verifies installation state.

## Release evidence requirements

Record exact commit SHA, CI link/results, mobile screenshots with viewport checks, deployed Lovable revision, Cloud migration IDs, Edge function versions, and redacted live verification results. Never mark a provider-dependent feature complete without evidence.
