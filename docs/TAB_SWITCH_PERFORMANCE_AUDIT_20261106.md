# Macro Mint tab-switching performance and N+1 audit — 6 Nov 2026

## Findings from source review

| Path | Before | After |
| --- | --- | --- |
| Today first visit | 1 diary + 1 water fetch | Same first visit; **cache** on subsequent visits |
| Diary first visit | 1 diary fetch, even when Today already fetched the same date | **Shared cached** `diary:day` result with Today |
| Foods first visit | 1 favorites fetch every time screen mounts | **Shared cached** favorites result with food search |
| Progress first visit | 1 weight query + 1 date-range query + **28 day-by-day queries** in WeeklyArchive | 1 weight + **1 shared date-range query**; charts and 4 weekly summaries computed locally |
| Progress 7/14/30 toggle | An extra date-range read on every range switch | No extra read; filter one cached interval locally |
| Return to a tab within 45 seconds | `useEffect` refetches its data whenever component remounts | React Query returns existing private data immediately, no fresh request |
| After a logged meal/weight or preference change | Global version causes refresh and resets loading state | One shell-level `bumpData` invalidates active per-user cache and background-refetches, retaining existing values |
| Saved meal with N items | Fetches *all* saved meals + **N sequential INSERT requests** | Fetches the one saved meal by ID + **one atomic multirow INSERT** |
| Route JavaScript | No default route preloading, first touch downloads a chunk | `intent` route preload + browser-idle staged preload of Today, Diary, Foods, Progress chunks |

**No schema changes needed:** Read-only verification against Lovable Cloud confirmed `diary_user_date_idx (user_id, entry_date DESC)`, `diary_user_date_meal_idx`, `diary_recent_idx`, the saved-meal user index and user/date weight indexes already exist.

## Correctness / privacy boundaries

- React Query cache keys are `["app-data", authenticated_user_id, domain, ...filters]`, memory-only and short-lived: **45-second freshness, 5-minute inactive retention**. Old-user cache entries are cleared when the signed-in account changes. The cache is not written to localStorage.
- Data changes use the existing `bumpData()` signal, triggering active-query revalidation. No stale-before-refresh empty-screen flashes. Access gates, SQL RLS and service secrets are unchanged.
- Every Progress summary is derived from the SAME account-scoped range query, preserving existing 7/14/30-day metrics and 4 weekly summaries, including current week partial data and nutrient null handling.
- Atomic saved-meal INSERT preserves source `favorite`, original item labels, computed grams and the existing nutrient rounding. RLS applies to each inserted row. No partial meals on a failed multirow insert.
- Browser idle preloading warms **code only**, not logged data or protected API calls. It is cancellable and runs sequentially, to avoid saturating mobile data connections.

## Verification and limitations

- Regression tests: cached reuse after unmount/remount, mutation-triggered refresh, no cross-user data display, archive equivalence, saved meal nutrient payload and branch SQL/release tests.
- CI browser test checks first and warm navigation, captures timing details to `mobile-browser-screenshots/mobile-audit/screens/tab-timing.json`, and retains the existing responsive page screenshots. CI demo runs locally with the production Supabase variables blank, so results are **not production latency claims**.
- The remaining unknowns are actual Pakistani mobile-network RTT, auth/session background refresh, the first time Recharts parses, and Supabase end-to-end latency with a real diary history. Those require a controlled signed-in test, not just a demo benchmark.
- This is a frontend/app-adapter patch only: **no migrations, Edge deployments, secret edits or website publication**.
- Avoid broad front-end memoization and blind skeleton animation. React's guidance recommends fixing repeated effects and data waterfalls first.

References: [TanStack Router preloading](https://tanstack.com/router/latest/docs/guide/preloading), [TanStack Router code splitting](https://tanstack.com/router/latest/docs/guide/code-splitting), [React memoization guidance](https://react.dev/reference/react/useMemo).
