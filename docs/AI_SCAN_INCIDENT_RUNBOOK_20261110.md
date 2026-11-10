# Macro Mint photo-scan failure: incident runbook
Date: 2026-11-10

## Evidence
A real Android Chrome screenshot shows the scan dialog reporting "The vision service could not analyse this photo." The existing client rendered the same string for all unclassified failures. The old `ai-scan` server returned `AI_FAILED` for any exception calling Gemini, OpenAI or Lovable AI. Neither establishes which upstream cause occurred.

## Changes in this release
- Classify provider HTTP failures into stable public codes: `VISION_QUOTA` (429), `VISION_CONFIG` (503), `VISION_MODEL` (503), `VISION_TEMPORARY` (503), `VISION_TIMEOUT` (504), `VISION_REJECTED` (502), `VISION_EMPTY` (422).
- Distinguish `RATE_LIMIT` from the local scan budget and `VISION_QUOTA` from the upstream AI provider.
- Edge logs contain **only** provider name, status, safe code and elapsed time. They MUST NOT include headers, API keys, images, user notes or provider error bodies.
- Client maps known error codes and HTTP statuses to safe, actionable copy. Network/relay failures and malformed success responses have distinct messages. The manual-search escape remains available.
- A mocked Android-size browser test simulates quota failure; unit tests cover quota/config/model/timeout and sanitized error copy.

## Production steps (do not conflate GitHub merging with deployment)
1. In Supabase → Edge Functions → `ai-scan` → Invocations/Logs, find failed requests around the user's scan timestamp. The screenshot alone doesn't expose the actual status. Before the new release, check response status and safe log metadata, without sharing full request bodies or tokens.
2. Deploy **all** current source modules in one release:
   - `supabase/functions/ai-scan/index.ts`
   - `supabase/functions/ai-scan/provider-errors.ts`
   - `supabase/functions/ai-scan/nutrition-label.ts`
   - `supabase/functions/_shared/http.ts`
   Preserve the existing `verify_jwt = false` handler-level bearer token checks.
3. Confirm `AI_VISION_PROVIDER`. It defaults to `gemini`. A configured Lovable/OpenAI key is **not** automatically used unless explicitly selected. Do not silently switch to a paid provider.
4. For Gemini, verify `GEMINI_API_KEY` is present **as a Supabase Edge Function secret**, belongs to the intended AI Studio project, and has permission/quota for the selected model. Check the project's API usage and limits. `GEMINI_MODELS` is optional; default model in source is `gemini-2.5-flash`. A provider 429 can indicate exhausted free quota, per-minute rate limit or spend restriction; source code cannot restore a depleted quota.
5. Verify `consume_ai_scan_budget` RPC is deployed and the user is eligible; local `RATE_LIMIT` and missing `NOT_CONFIGURED` are different from provider errors. Do not disable or bypass quotas.
6. Confirm the web frontend points to the intended Supabase project and does not set `VITE_SCAN_ENDPOINT` to a stale alternative. Publish the frontend after the function release.
7. Test with **one new non-sensitive food photo**, from a signed-in test account, without exceeding the quota. Check the resulting review screen and confirm that nothing is auto-logged. Repeat on Android Chrome and iOS Safari. Check input, keyboard and fallback behavior.
8. If an error persists, report the **code, HTTP status, safe provider name and sanitized failure category** from the new logs; never copy API keys, session tokens, raw image data or provider response bodies.

## Interpretation after deployment
| Error code | Likely operator action |
| --- | --- |
| VISION_QUOTA | Check provider's API usage, spend cap, rate limit, quota reset and project tier |
| VISION_CONFIG | Verify project authorization, API key validity, enablement and regional availability |
| VISION_MODEL | Confirm model identifier and available vision models |
| VISION_TEMPORARY / VISION_TIMEOUT | Check provider uptime/latency, reduce image size and safely retry later |
| AI_NOT_CONFIGURED | Configure the explicitly selected AI provider's server secret |
| NOT_CONFIGURED | Verify atomic scan-budget RPC exists and Edge Function service-role access |
| RATE_LIMIT | Respect app's own limit; never work around rate controls |
| SCAN_ENDPOINT_MISSING | Deploy and route the `ai-scan` Edge Function |
| SCAN_NETWORK | Check CORS, network connectivity, relay health and function logs |

**Release status:** GitHub source/tests are verifiable from CI; live Supabase provider secrets, quota, Edge deployment and user-session errors require access to production diagnostics.
