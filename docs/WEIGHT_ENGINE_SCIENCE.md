# Macro Mint weight logger and energy engine: evidence, assumptions, and safety

Status: standalone engine + reusable component, **not mounted on a route**. No database schema changes and no automatic edits to an individual's saved nutrition targets. Before adding the user-facing UI, the owner chooses its placement.

## Evidence tiers

| Feature | What it does | Evidence tier |
|---|---|---|
| Adult BMI | `weight_kg / (height_m)^2` with CDC adult screening cutoffs | Public-health screening convention, **not a diagnosis or calorie algorithm** |
| Estimated resting energy (BMR) | Mifflin–St Jeor REE equation using weight, height, age and sex | Published predictive equation, **not individual metabolic measurement** |
| Estimated maintenance calories | Predicted REE × conventional activity factor | Research-informed but individually uncertain assumption, **not a measured TDEE** |
| Goal calorie adjustment | App's existing fixed lose/gain/recomp kcal adjustment and its sex-based minimum policy | **Product assumption** and owner-editable starting point, not validated personal prescription |
| Weight trend | Median daily readings, two 7-day medians and a Theil–Sen slope over 28 days | Robust statistics applied to weight logs; **exact alert thresholds not clinically validated** |
| Plateau alert | Possible plateau for lose/gain objectives after >=18 of 28 days and >=3 each week, recent weigh-in and <0.15% body mass/week change | **Engineering heuristic**, explicitly not a diagnosis of adaptive thermogenesis |

## Source literature

1. Mifflin MD, St Jeor ST, Hill LA, et al. *A new predictive equation for resting energy expenditure in healthy individuals.* Am J Clin Nutr. 1990;51:241–247. DOI 10.1093/ajcn/51.2.241. Original validated equation on adults 19–78 (n=498). https://pubmed.ncbi.nlm.nih.gov/2305711/
2. Frankenfield D, Roth-Yousey L, Compher C. *Comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults: a systematic review.* J Am Diet Assoc. 2005;105:775–789. DOI 10.1016/j.jada.2005.02.005. Mifflin–St Jeor was comparatively strong but individual prediction errors remain. https://pubmed.ncbi.nlm.nih.gov/15883556/
3. CDC. *Adult BMI Categories.* Adult 20+ screening: <18.5 underweight, 18.5–<25 healthy, 25–<30 overweight, >=30 obesity with class intervals. BMI does not measure fat mass, identify an individual medical condition or indicate a calorie goal. https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html
4. NIDDK / NIH. *Body Weight Planner.* Proper weight trajectory prediction is dynamic, not a constant '3,500 kcal per pound' rule. https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner
5. Sen PK. *Estimates of the regression coefficient based on Kendall's tau.* J Amer Statist Assoc. 1968;63:1379–1389. DOI 10.1080/01621459.1968.10480934. Median pairwise slope is a robust trend estimator. **This paper does not validate a clinical body-weight plateau cutoff.**

## Engine rules, not scientific overclaims

- The **28-day window**, **18 weigh-in minimum**, **three per week**, **latest <=3 days old**, **0.15% mass/week** threshold and **0.6% slope IQR** noise guard are conservative product choices. They must remain documented and cannot be marketed as a scientifically proven diagnostic rule.
- Distinct dates are deduplicated by taking the median. Future dates, invalid dates and implausible 20–500 kg readings are ignored for trend evaluation. Gaps and low coverage yield *insufficient_data* rather than fabricated interpolated weights.
- For weight loss and gain, near-flat Theil–Sen slope **and** first-vs-last weekly median shift are both required for a possible stall label. High trend dispersion yields *inconclusive*. A trend in the opposite direction has a separate status. For maintenance and recomposition, stable scale weight is **not** a negative outcome.
- A "possible plateau" is **not** evidence of a metabolic slowdown. Weight fluctuates with hydration, gut contents, glycogen, menstrual cycle, medications, sodium and measurement conditions. Reassess diet logs and activity rather than automatically reducing calories or issuing alarming diagnoses.
- **No automatic calorie adjustments on plateau.** Users should not see auto-prescribed calorie restriction triggered by a noisy scale.
- For adult BMI <18.5 and lose/recomp goals, the engine **withholds** an automatic calorie deficit; it suggests a personalised discussion. This protects an underweight user from blindly cutting calories. It does not apply to pregnancy, lactation, minors or complex clinical conditions; those are outside this standard equation's scope.
- Mifflin–St Jeor estimates resting energy use; the label **BMR** is colloquial, while the published validation measured REE/RMR. It is not a minimum food intake requirement. When only birth year is available, the age used is approximate by up to one year.
- User-saved calorie targets remain authoritative until the user explicitly chooses to replace them. The new module calculates an estimate without updating profiles, goals, Supabase tables or auth.
- Current app stores `weight_entries` with RLS and a unique user/date upsert. UI writes via existing `backend.addWeight` and `bumpData`. No migrations required. Imperial lb values convert to kg for storage; the display uses the user's profile preference.

## Verification before UI rollout

- Unit tests: BMI category boundaries, male/female formulas, age validation, underweight deficit guard, goal adjustment, date parsing, duplicate days, sparse logs, gain/loss/maintenance/recomp, sustained weight change, possible plateau, outliers.
- Verify `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm exec eslint . --rule 'prettier/prettier: off'`, `pnpm build`.
- After selecting placement, use a real authenticated account to test log -> refresh -> correct past date -> trend refresh -> export and RLS separation, in mobile Safari and Chrome. Since Lovable Cloud Email auth is disabled, these live workflows cannot yet be fully verified.
- The existing `computeGoals` onboarding calculator has fixed adjustment and sex-specific floor behavior. This module introduces a more conservative underweight check but does not silently rewrite onboarding behavior. Before applying it to onboarding, unify policy and retest old expectation snapshots.


## Target-weight planning added November 3, 2026

The `src/lib/weight/timeline.ts` module is a **planning range**, not a personalised deadline or a direct prediction from BMI. It requires current weight, goal weight, height (for adult BMI screening), and a directionally consistent objective.

- For weight gain, Iraki et al. (2019), *Nutrition Recommendations for Bodybuilders in the Off-Season: A Narrative Review* (Sports 7(7):154, DOI 10.3390/sports7070154), suggest ~0.25–0.5% of body weight per week for novice/intermediate bodybuilders, generally with resistance training. The module integrates an illustrative relative weekly gain between these rates; this is **not a universal healthy timeline**, not a predicted rate of muscle gain and should not be used as a guarantee. Advanced trainees may progress more slowly. https://pmc.ncbi.nlm.nih.gov/articles/PMC6680710/
- For weight loss, CDC public-health guidance describes gradual loss of roughly 1–2 lb/week as often more sustainable than rapid loss. It is a broad population recommendation, not an individual prescription. https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html
- For maintenance and recomposition, stable weight need not be a failure; the planner does not invent a target-weight deadline.
- Underweight BMI and further weight-loss targets are flagged for individual review, without a timeline. If a goal contradicts the selected gain/lose direction, it is rejected before saving.
- No formula establishes a guaranteed arrival date. Health, training, medications, hydration, adherence, changes in energy expenditure and muscle-versus-fat gain matter.

Example: 60→74 kg with a gain objective can produce roughly 10–20 months from the body-weight-percentage starting range. **Do not represent this as exactly when the user will reach 74 kg.**

## Numeric input contracts

`src/lib/validation/limits.ts` is the central source for adult profile age/height/weight, target weight, weight logging (kg and lb), meal servings, portions, custom food nutrition, calorie/macro targets, hydration and admin trial/reward numeric settings. Each touched UI field declares visible browser bounds **and** the submit path rejects nonfinite, blank or outside-range values; browser min/max attributes alone are insufficient.

- Adult age: 20–100 years; height 120–240 cm; current/target weight 25–450 kg. These are **consumer-app sanity bounds**, not universal human/clinical ranges, and should not silently clamp an impossible value.
- Weight log storage remains the existing RLS-protected daily user/date upsert. A user can update a past entry; conversion from pounds to kilograms is performed before saving.
- Calories and macros use the existing database constraints. Custom food nutrients have per-100g physical sanity ceilings; sodium is in mg and is **not** capped at the same number as kcal.
- The current database schema has its own wider guardrails (profile heights 50–272 cm and weights 20–500 kg) and existing checks on `nutritional_goals`. Those are protection against extreme values but do **not** substitute for the narrower adult app validation. No database migration was applied.
- Units should be checked across onboarding, Settings and the weight form as the application grows. Avoid falsely claiming every future numerical control is checked merely because one field uses `type=number`.
