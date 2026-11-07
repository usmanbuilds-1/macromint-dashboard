# Macro Mint: source-level daily UX audit and design contract
2026-11-07 · Implementation branch: feat/task-first-daily-screens-20261107

## References, not a paint-by-numbers template
- Impeccable, slop catalog: https://impeccable.style/slop/ — reject redundant labels above every heading, generic cards, repetitive explanation, false dashboard occupancy and uncontrolled size/radius.
- Apple, Design principles: https://developer.apple.com/design/human-interface-guidelines/design-principles/ — simplicity is not the removal of capability; keep important tasks near and advanced actions available.
- Apple, Layout: https://developer.apple.com/design/human-interface-guidelines/layout — information hierarchy follows use order, groups convey meaning, progressive disclosure for less frequent controls.

Impeccable's marketing-site requirements (one full-screen section per screen, asset counts, giant illustrations and shader effects) are **not** appropriate to an authenticated nutrition logging application; do not transplant them here.

## Findings and decisions
| Screen | Source problem (before) | Implemented correction | Must remain |
| --- | --- | --- | --- |
| Today | Empty-day calorie+macro targets hidden; huge blank lower half; Water competing with food logging; no repeat entry path | Compact honest **0 logged / real target** summary with actual macro targets; main Add food and Scan photo; one short next-step or an actual previously logged food; Water collapsed | Unknown nutrient coverage when any foods are logged; immediate tab switch; meal journal for real entries |
| Diary | All four meal groups suppressed until first entry; generic empty message dominated; Copy meals occupied same hierarchy as primary logging | Four meal rows always present when not loading; one per-meal Add; edit, duplicate, favorite, delete and Save as meal retain behavior; Copy meals a secondary disclosure below | Historic date navigation, no future date, correct portion math, inline edits and undo |
| Foods | Search-only empty screen, no visible re-use value; zero-kcal risk on unknown foods | Actual recent foods (bounded account-scoped query) show when available and open portion review; if none, one truthful line; search, favorites, saved meals, scan, manual entry all remain | Provider attribution, missing nutrient values, favorite controls, no dummy dataset |
| Progress | Empty screen told users nothing useful; chart mockups encouraged fabricated histories | Two concrete thresholds for future trends and direct Log food / Record weight actions; only real chart data appears when present; existing range selection and detailed disclosure stay | No unlogged days treated as 0; no invented weigh-ins, streaks, averages or charts |

## Product interaction contract
1. An empty day is **not** proof of eating zero calories, but a day with no entries has 0 recorded calories. Wording should say "logged" rather than "consumed" for a new user. When entries include unknown nutrition, never infer the missing fields.
2. Today is a command center; Diary is the editable dated log; Foods is search and reuse; Progress compares measured history. Avoid four duplicate pages with renamed headlines.
3. Primary action has one filled accent button per active area. Other choices are quiet bordered buttons, tabs, or text rows. No false analytics, decorative food renders, gradient cards, streak confetti, generic motivational slogans, or overprominent hydration.
4. The real recent-food shortcut must open a serving review. A previously logged food is never inserted without user review.
5. No per-day N+1 reads: Today one date read plus bounded recent snapshot; Progress retains one bounded diary-range read and locally derives summaries. No background navigation animation on Today.
6. Constrain mobile at 320px and 390px, tablet 768px, desktop 1440px, no overflow, min 44px tap targets, keyboard-safe dialogs and proper contrast.

## Verification and limits
- Tests: source architecture guard, nutrition unit tests, mocked mobile browser audit with screenshots and responsive checks.
- Release: merge only after both Verify Macro Mint and Mobile browser smoke audit succeed; inspect the screenshot artifacts, not only pass/fail.
- The screenshots are isolated demo scenarios, not proof of real mobile browser or live RLS behavior.
- No Lovable AI calls, no changes to production data/roles, no invented retention uplift.
