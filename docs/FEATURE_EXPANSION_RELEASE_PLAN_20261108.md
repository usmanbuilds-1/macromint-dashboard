# Macro Mint — staged feature expansion and release gates
**Proposed:** 2026-11-08. **Scope:** source implementation against the actual GitHub repository; production database and external-provider releases are deliberately separate gates.

## Product principles
1. Logging is always one tap from Today and Diary. Do not enlarge the four-tab navigation; Recipes, Labels and Planning are contextual flows under Foods, Goals or Progress.
2. Show **only real persisted meals, personal weight readings and nutrient data**. Missing values are unknown, never zero. Never display invented histories, personalized targets or AI certainty.
3. Preserve editable grams, partial portions, numeric barcode lookup, saved meals, favorites, and correction of any scan. No automatic logging from a scan/voice transcript without explicit user review.
4. Food quality matters more than more empty charts; always reveal source, verification status, and nutrient coverage where those affect a choice. A verified source record can still be incomplete.
5. Mobile first: no forced keyboard pop, no endless sheet, correct tap targets and clear error/retry states. No heavy dependencies or third-party scripts in the critical Today bundle.

## Existing contracts
- The shared Backend interface and both adapters already contain recipe read/create/log/delete methods. Recipe editing and cooked-yield snapshots are not yet transactional.
- NutrientRecord stores 4 macronutrients and a set of micronutrients, with null meaning unavailable.
- Food search and numeric barcode lookup go through the existing food-search Edge Function. The AI meal photo workflow has an explicit review screen and server quotas.
- User diary/weight/progress queries are account-scoped with RLS and bounded range requests; do not add per-day network loops.
- Saved meals and recent items already exist, as does the user data export.

## Release A: Daily logging & food reliability — no migration
- [ ] Regional aliases and quantity measures, with per-food editable gram estimates and explicit approximate labels (roti/katori/cup etc); never assume a universal katori weight.
- [ ] Result/source quality with macro and micronutrient coverage (verified vs unverified vs unknown); no invented nutrients.
- [ ] Camera/image barcode detection as a guarded progressive enhancement; fall back to manual numeric lookup on unsupported browsers, HTTPS only, no photo uploads/storage for this feature.
- [ ] Personal repeat ranking using already authorized recent diary entries, bounded to a small set and computed client side; recent meal context is only a suggestion.
- [ ] Real micronutrient exploration from existing bounded diary range, no invented target percentages.
- [ ] Weekly insights from logged days only; missing diary days stay missing.
- [ ] Tests: unit conversion boundaries, visibility of unknown nutrients, barcode parsing/unsupported detection, stable ordering; fresh-user and returning-user browser flows, accessibility and bundle checks.

## Release B: Recipes, shopping and meal planning
- [ ] Recipe editor backed by the existing recipe methods: ingredient search, quantities, serving count, honest missing nutrients, preview, log and delete; cooked-yield field requires a durable schema contract.
- [ ] Editing ingredients must be atomic and ownership-checked; **do not** emulate update by deleting and re-creating referenced recipe records. Add transaction-safe owner RPC with migrations, rollback testing, and read-only production schema audit before activation.
- [ ] Planned vs eaten records in a separate RLS-protected table, scoped by user ID and valid local dates. Plan creation must **never** add a diary entry. Mark eaten through explicit server-confirmed action, with idempotency and duplicate protection.
- [ ] Recipe-derived grocery lists are computed from the user's selected plans, never scraped from nutrition labels or inferred from private data of other accounts.
- [ ] Flexible day templates stored in a separate per-user table with unique (user_id, day_type), bounds and explicit choice; no silent changes to actual user targets.
- [ ] Tests: two-user positive/negative RLS, mutation atomicity, duplicate planning, 0/unknown micro propagation and exported data completeness.

## Release C: Optional automation integrations
- [ ] Voice dictation: opt-in, show browser/third-party privacy warning, no auto-submit, validate transcript and show item-by-item review; incompatible browsers fall back to typed natural language.
- [ ] Nutrition label extraction: behind the existing server-side scan quota and a new schema-validated response type. Require verification of serving size, per-serving vs per-100g, and sodium/salt units; show image only transiently and do not persist without consent.
- [x] Local ingredient text import: accept a plain pasted list with review of each database match, no website fetching, and no inferred nutrients.
- [ ] External API keys must live server-side; validate quotas/costs and return graceful provider-unavailable errors. No user account data in AI prompts unless essential and disclosed.
- [ ] Test cancellation, denial, offline/slow-network, unsupported APIs, malicious input, and rate limits.

## User journeys
1. First log: open Today → Add food → search / barcode / scan / manual → review portion and food source → save → see actual totals and item in Diary.
2. Return: Today suggests genuinely recent item when available; tapping it opens portion review; user can change grams or reject.
3. Recipe: Foods → Recipes → search/select ingredients → edit gram amounts → review known totals → save → log chosen fraction/servings. Only persisted owner recipes appear.
4. Explore: Progress → selected period → actual recorded days → nutrient coverage and top source foods; do not show percentage of a medical RDA with no demographic context.
5. Plan: select meals for future local dates without changing consumed totals, then explicitly log eaten on the day.
6. Voice/URL/label: consent → preview recognized result with provenance → edit → explicit save.

## Performance budget and architecture
- Keep Today and primary navigation chunks unaffected by recipe/label/voice modules; lazy load on entry.
- One bounded range fetch for charts, insights and micronutrient report. No N+1 on recipes: batch/select ingredients where schema allows; otherwise only load ingredients for an explicitly expanded recipe.
- Limit search to explicit submit; debounce where applicable; dedupe in-flight keys and cache by session account.
- Avoid extra global dependencies for camera; native BarcodeDetector only when available. Revoke object URLs and stop camera tracks.
- All new feature modules should be <= 180 lines; split data math, persistence and presentation.
- Use consistent existing typography, forest-green palette and minimal row-based IA; one primary action per view, no fake photo cards, pill shortcuts or hydration hero.

## Security release checklist
- RLS membership + owner identity verified on production schema **before** new persistence features are enabled.
- Server validates all bounds, dates, ingredient length, user associations and authorization; client validation is only UX.
- No service role, provider token, recovery code or user-submitted image committed to source; no unreviewed provider calls.
- CSV/JSON exports include new data where supported; deletion cascade is tested for each new table.
- Browser media permission requested only on deliberate user interaction; stop tracks on close; never promise offline recognition unless actual provider is on-device.
- For Open Food Facts: ODbL requirements, attribution and data provenance; for USDA: use backend secrets, not browser API keys.
- All CI workflows green; mobile screenshots verified at 320 / 390 / 768 / 1440, including first use and populated data.

## Gated release policy
A merged UI does **not** prove production deployment. Schema migrations, server functions, external accounts/secrets, live two-user security tests, and actual mobile compatibility remain independent release gates. If any provider is missing, ship a clearly marked fallback instead of pretending the capability works.

## Measurement
First persisted log / new eligible accounts; median and p90 time-to-first-log; day-1/day-7 **logging** retention; repeat-log use; food search no-match rate; recipe create-to-relog rate; and provider error rate. Only collect cross-user aggregates with explicit privacy review and owner-only access. No dark-pattern reminders or fabricated engagement claims.


## November 8: URL import explicitly retired
The product no longer imports recipes from external URLs or accepts recipe JSON-LD.
Paste ingredient lines directly into Foods → Recipes. All food matches and grams
are reviewed by the user. See `docs/RECIPE_IMPORT_SECURITY_GATE_20261108.md`
for deployment requirements to remove the retired server fetch endpoint. Historical
feature plans above are superseded by this decision.
