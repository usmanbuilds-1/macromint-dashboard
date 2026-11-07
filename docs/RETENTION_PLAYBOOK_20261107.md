# Macro Mint — first-week activation and retention playbook
Date: 7 November 2026

## Product diagnosis
Early tester disengagement is a **hypothesis**, not yet a measured cause. We have no verified event-level funnel or interviews tied to drop-off. Macro Mint currently asks users to complete onboarding and then interpret multiple empty ledgers/charts. Food entry has included an extra chooser even when a separate scan action is visible. The diary, food library and progress tabs compete to explain the same workflow. These are plausible sources of friction, not proof of why an individual stopped logging.

## Evidence and limits
- A 2023 mixed-method nutrition-app study found clear introduction/purpose and flexible tracking important when starting; easy navigation, reliable food data and few ads mattered while using the app. High time investment was a prominent quitting reason. https://mhealth.jmir.org/2023/1/e39515
- A 2026 scoping review of 59 nutrition-app studies found self-monitoring, prompts, personal feedback and goal setting common. The synthesis did not establish which combination reliably causes long-term retention. https://mhealth.jmir.org/2026/1/e82276
- A 2024 scoping review of 18 studies (525,824 participants) found disproportionately early abandonment and reasons spanning usability, time, privacy, content and technical problems. https://www.jmir.org/2024/1/e56897
- In a 2023 notification micro-randomized trial, prompts increased short-term opens but did not significantly extend time to disengagement. Notifications are not a proven retention fix. https://pubmed.ncbi.nlm.nih.gov/37294612/
- A qualitative diet-monitoring study found participants preferred flexible entry, pictures and self-directed exploration over lengthy tutorials; annoying popups and tedious workflows undermined use. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0292390

These studies support testing the changes below. They are not evidence that this particular Macro Mint release has improved retention. No specific retention lift is promised.

## Smallest complete habit loop
1. **Context / first value:** first authenticated Today visit gives a short statement of purpose, one obvious Add food action and Scan photo alternative. On an empty day the action precedes the overview; no duplicate empty meal widget.
2. **Ability:** Add food goes directly to search, with recent foods, saved meals and favorites above an empty query. The input never autofocuses on a short mobile viewport. Food selection retains a reviewable portion before save. On Foods, the default meal follows local time rather than arbitrarily routing everything to Snacks.
3. **Immediate feedback:** the logged item changes the day's visible nutrition ledger and meal list. Missing nutrients remain unknown, never fabricated as 0.
4. **Easy return:** recent foods and saved meals can be reused without retyping nutrition; diary copying is available on demand. The Progress page explains logged days honestly and hides optional macro/weekly details behind disclosure.
5. **Recovery:** users can log a meal later and review other dates. No broken streak, shame copy, fabricated score, or forced daily login.

## First-week tester path
- Day 0: reach first food entry in under 90 seconds after onboarding. Record the precise tap count and errors; compare against the older chooser journey.
- Day 1: a tester can repeat the same breakfast using Recent or Favorites; observe whether food selection and portion correction are understandable.
- Day 3: test search failures for Pakistani foods, brand misses, slow connections and Android keyboard clipping; collect actual failed searches with user consent.
- Day 7: show Progress only when there is real history; ask whether the data changed a choice, not just whether the screen looks nice.

## Measurement contract
Definitions require real user-authorized event data, not guesswork or raw scans.
- **Signup completion:** eligible completed registrations / eligible registration starts, per same anonymous session where consent permits.
- **Activation:** users who successfully persisted their first diary entry within 24h of registration / newly registered users. A page view is not activation.
- **Time to first log:** first persisted diary entry timestamp minus account creation timestamp (median, p90).
- **D1 and D7 logging retention:** share of new signup cohort with >=1 persisted food entry on the next / seventh local calendar day, not merely an app open. Report cohort sizes and timezone assumptions.
- **Repeat log reuse:** share of returning loggers who select Recent, Favorites or Saved Meals, plus completion rate.
- **Search success:** query sessions that end with a persisted food entry; segment missing food, low-confidence nutrient and latency issues.
- **Silent abandonment:** no logging on days 2–7; do not label an unrecorded day as zero kcal.

Existing diary entries support *user-level* days-with-food reporting in Progress. They are NOT sufficient to claim production signup cohorts, first-action timing, or cause of churn. Do not build secret cross-user reporting by querying RLS-protected food logs. An authorized, privacy-reviewed analytics implementation, consent handling and admin-only aggregate reporting must precede any full cohort dashboard.

## Controlled experiments
Run an A/B test only with enough new users, stable assignment and consent; current tiny beta is too small for inferential lift claims. First use 5–8 moderated usability sessions with screen recording *only by opt-in*. Observe time to first food, mis-taps, blank data interpretation, whether users can repeat a meal, and whether the value is understood in their own words. Ask testers who returned and those who did not; do not sample only highly engaged users.

## Excluded from this release
No streak gambling, forced daily goals, loss aversion copy, fake social proof, unsolicited notifications, social sharing of private food data, or automatic change to calorie targets. Browser push reminders require explicit consent, support for service workers, and a reliable delivery scheduler; preference toggles alone do not deliver pushes. Likewise payment/ads do not substitute for a useful product.

## Release gates
Code changes are source-only. CI, demo browser checks, two-user live RLS/auth tests and Android/iOS real keyboard testing remain distinct gates. Owner/admin role changes are privileged database operations and must never be inferred from a matching display name.
