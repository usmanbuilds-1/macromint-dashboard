# Recipe link importer — production release gate

Implemented in source: structured recipe schema extraction from supported HTTPS hosts; manual JSON-LD paste fallback; no automatic nutrient calculation; each imported ingredient must be matched and reviewed in grams.

## Defenses
- Exact allowed hosts: `www.bbcgoodfood.com`, `www.allrecipes.com`, `www.seriouseats.com`.
- Server reconstructs HTTPS URL from canonical host/path and strips tracking queries and fragments. No userinfo, custom port, redirects, cookies, Authorization forwarding, or arbitrary domains.
- Response must be HTML and smaller than 600 KB, streamed under an 8-second timeout; no document scripts run.
- Authenticated, entitled users only; migration 0018 creates an atomic 8-import/hour owner-keyed budget accessible only by the service role.
- Result contains a short title, optional stated yield and up to 30 ingredient strings; **never nutrition data or recipe auto-save**.
- If a site blocks bot fetches, the JSON-LD paste fallback works entirely locally.

## Critical SSRF caveat
An application-level hostname allowlist **does not** by itself prevent DNS rebinding. For safe production, approve and enforce the allowed destinations at **the network egress layer**, including verified destination IP binding and denial of private/link-local/metadata networks. Disable automatic redirects on the network proxy too. This is an operational prerequisite, not something the frontend can supply. See the OWASP SSRF Prevention Cheat Sheet.

Both environment switches must be explicitly true to enable the endpoint:
- `RECIPE_IMPORT_ENABLED=true`
- `RECIPE_IMPORT_EGRESS_APPROVED=true`

Leave either unset to keep the URL importer disabled until the provider/network constraints are verified. Do not weaken either gate to make demos look functional. Apply migration 0018, deploy the Edge Function, review rate limits, then run two-user auth and unsupported-domain tests before enabling.

## Smoke and quality checklist
- Repeated import attempts return 429 after the quota (including concurrent requests).
- A request with localhost, IP, embedded username, HTTP, redirect, oversized HTML or unapproved domain cannot fetch an internal service.
- A real site can fail due to bot protection; surface a clear failure and allow manual JSON-LD fallback.
- Imported ingredient strings are untrusted plain text. React escapes them and does not execute HTML.
- Every imported food still requires search selection and gram confirmation.
- Import a recipe, save it, duplicate it, log a fraction and verify old diary snapshots stay stable after edits.
