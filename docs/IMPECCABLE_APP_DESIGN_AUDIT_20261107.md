# Macro Mint — Impeccable and Apple task-first design audit
Date: 2026-11-07
Scope: authenticated Today, Diary, Foods, Progress, both first-run and first-logged states.

## Audit method
Compared the current 390px screenshots produced by the existing Mobile browser smoke audit with the actual UI components and styles. Applied Impeccable's slop catalog, especially repetitive explanations, nested cards, label/heading duplication, equal-weight tiles, low-information whitespace and copy-paste layouts. Used Apple's current Human Interface Guidelines for task hierarchy, aligned grouping, progressive disclosure and touch size.

References:
- https://impeccable.style/slop/
- https://impeccable.style/docs/improve-design/
- https://developer.apple.com/design/human-interface-guidelines/design-principles/
- https://developer.apple.com/design/human-interface-guidelines/layout/

This is a design review informed by those published guides. It is not a claim that the Impeccable detector CLI/extension was run, and no detector result is fabricated.

## Findings and source changes

### Today
**Problem:** The empty state had the same invitation to start logging immediately under the Add food action. Logged meals were hidden behind a collapsed meal accordion even after the user entered something. The page fetched water on every load despite its collapsed, secondary placement.
**Change:** Retain compact daily calorie + macro targets, a real-data meal ledger, and visible logging and photo actions. Display the first actual populated meal open by default; let the user collapse it. Load water data only when the optional details disclosure opens. Keep repeat-previous-food only when backed by a real entry. Use one subdued surface for the daily nutrition ledger.
**Why this works:** Important numbers and real logged foods can be read without tapping more panels; optional utilities don't consume initial requests.

### Diary
**Problem:** Four identical 'Not logged' labels conveyed nothing new; tiny bare plus targets weren't self-explanatory. Copy-day action was after the entire journal. Every logged entry had a tap-to-edit row **and** a duplicate edit icon.
**Change:** Four meal areas remain, each has a proper labeled Add target. Real entries still show kcal and macros and support tap-to-edit; the existing More menu retains duplicate, favorite, delete. Move Copy meals before the sections. Preserve exact-date controls and all advanced nutrition editing.
**Why this works:** A fresh user can pick the meal without reading a tutorial, and experienced users don't lose features.

### Foods
**Problem:** Scan and custom-food entry appeared as two competing feature tiles directly under an already prominent search box. Search, Favorites and Saved meals are actually different tasks, not three decoration cards.
**Change:** Preserve all three tabs, database search, private favorites and saved meals. Present Scan a photo and Create a food as quiet stacked action rows. Show only genuinely logged recent foods with a direct reuse action. No sample foods or invented calorie values.
**Why this works:** Search is the primary task; alternatives remain discoverable without dominating.

### Progress
**Problem:** A generic sentence and two setup counters left most of the first-run screen without any sense of time or daily habit. Fake charts would mislead people.
**Change:** Render an honest last-seven-days activity strip from diary dates already fetched for Progress. Distinguish a recorded food day from an unrecorded day, without calling an unrecorded day zero calories. Show required data thresholds for calorie and weight patterns and link to the real log and weight form. Real charts, macro coverage rules and weekly history remain unchanged for eligible data.
**Why this works:** A new user understands that entries accumulate across time; a returning user can identify which days contain real records.

## Visual system and explicit exclusions
- Preserve warm Macro Mint paper, its existing green leaf mark, serif display and sans data. One main brand-green filled CTA per task.
- Use typography, alignment and hairlines before adding containers. Never nested decorative boxes, gradient glows, rings, split-color headlines or fabricated imagery.
- Keep responsive targets >=44 CSS px; avoid horizontally clipped text on 320px phone and keyboard-short viewports.
- Water, photo scanning, copy-day, custom foods, favorite, saved meal reuse, entry correction, progress charts and account controls must remain functional.
- No invented streaks, pseudo food photographs, fake user history, sample chart data, paid AI prompts or new tracking providers.
- No new server requests are needed for the Progress strip: data comes from the existing bounded diary-range query.
- No new water read occurs until the user requests the secondary water details.

## Regression and acceptance criteria
- Signed-in first-run Today: real targets (or explicitly unset), one obvious Add food, existing Scan photo, no fake entries, water collapsed, no initial water query.
- First real diary entry: Today visibly shows its actual name, amount and kcal without requiring another expansion click; Diary editing, favorites, saved meals and copy still available.
- Diary: four labeled Add targets, previous/next dates, copy action near the top, one More menu per logged item.
- Foods: scan/create are two stacked, tap-sized rows, search and saved/favorite tabs still work.
- Progress: last seven actual local diary dates, 0 if no recorded dates; multiple entries on one date count as one logged day; trends only appear from real data.
- Automated mobile audit at widths 320, 390, 768, 1440, plus type/unit tests and source architecture checks. CI pass does not prove live-user device performance or deployment.

## Open external release checks
Physical Android/iPhone testing and live account-isolation/security tests are distinct from isolated demo browser smoke. No Lovable AI requests, no role elevation, no database migrations and no production deploy are performed by this source-only change.
