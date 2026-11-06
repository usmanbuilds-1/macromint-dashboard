# Macro Mint internal UX audit — Apple Design Skill

Review basis: [dickwu/apple-design-skill](https://github.com/dickwu/apple-design-skill), including `SKILL.md` and the relevant Apple Human Interface Guidelines sections. Framework: responsive **React web app** (not native iOS). Apply the principles of clarity, accessibility, information hierarchy and predictable interactions; do not copy Apple-specific native visual materials or force Liquid Glass on the existing Macro Mint design.

Reviewed source: `AppLayout`, `Today`, `Diary`, `Foods`, `FoodSearchDialog`, `ServingConfig`, `ScanDialog`, `Goals`, `Trends`, `Settings` and `Onboarding`. Findings are from code review plus isolated browser checks, not a live two-account acceptance test.

## High-priority findings implemented

| Issue and impact | Fix in code | Guideline |
| --- | --- | --- |
| Mobile hides **Diary** behind secondary links, though recording and correcting meals is the core job; desktop called the same destination **Trends** and mobile **Progress** | Four consistent mobile destinations **Today, Diary, Foods, Progress**; Settings remains reachable from the always-visible menu; desktop says Progress | `tab-bars.md › Best practices`; `layout.md › Visual hierarchy` |
| On Today, the primary **Log food** button only revealed a second choice, increasing taps and concealing search | One-tap **Add food** (search) beside clearly labeled **Scan photo**; empty day tells a new user what to do | `designing-for-ios.md › Best practices`; `writing.md › Best practices` |
| The photo picker used HTML `capture=environment` for its only input, which forces the camera on some mobile browsers and hides existing photos | Separate explicit camera input and gallery input; both run through the existing `prepareImage` and review flow | `entering-data.md › Best practices`; `accessibility.md › Mobility` |
| Onboarding presented a metric/imperial dichotomy inappropriate for common Pakistani mixed-unit usage; users were unsure whether height/weight converted | Height **feet + inches**, weight and target **kg** on onboarding and profile settings. Existing storage and energy computations remain cm/kg, no migration or heuristic | `entering-data.md › Best practices`; `onboarding.md › Best practices` |
| Activity options exposed multipliers as if people needed to understand the energy equation to choose a daily routine | Display activity names and descriptions only, with more concrete selection guidance; calculation remains unchanged | `writing.md › Best practices`; `onboarding.md › Best practices` |
| A Settings **Measurement system** toggle announced values were converted when the profile form still displayed cm/kg | Remove misleading toggle from these onboarding/profile entry screens; use consistent ft/in and kg | `feedback.md › Best practices`; `writing.md › Best practices` |
| Foods search had duplicate Enter handling plus a shortcut to the Favorites tab sitting immediately below that tab | One form submit handler, remove duplicate navigation, label **Favorites** accurately, explain how to search and scan | `searching.md › Best practices`; `layout.md › Visual hierarchy` |
| Diary's main action and photo action were inconsistent with Today and Foods | **Add food** and **Scan photo** directly in Diary, correct selected date retained; clarify **Copy meals** | `writing.md › Best practices`; `feedback.md › Best practices` |
| Goals offered manual edits and automatic recalculation without stating the difference | Explain that one updates targets while the other replaces estimates, without changing nutrition math | `writing.md › Best practices` |
| Progress was hard to interpret on a completely empty history | Give a next step to start logging before charts are populated | `writing.md › Best practices`; `onboarding.md › Best practices` |

## Verification

- No edits to SQL/RLS, entitlement rules, live Edge functions, secret keys, scan limits or food estimation mathematics.
- Use disposable unit tests and GitHub build/security checks, plus a dedicated **isolated demo** browser test of actual onboarding, bottom navigation, Today, Diary, Foods, Progress, Settings, and camera/gallery choice. Production preview test remains separate.
- Maintain the existing brand palette, typography and simple section structure. No decorative glass, fake dashboards, gradients, new paid features, or unrelated design overhaul.

## Remaining concerns (not represented as fixed)

1. Existing `text-[11px]` supporting text in nutrient/scan views needs a dedicated real-device accessibility and contrast pass (`accessibility.md › Vision`, `typography.md › Ensuring legibility`). This requires actual rendered CSS and zoom/text scaling evidence.
2. Native iOS tab bar and SF Symbols rules are **not** requirements for a responsive website. Check tap targets, semantic labels and screen-reader access instead.
3. A demo browser check cannot validate real Supabase two-account privacy, AI scan quality, image HEIC decoding differences between browsers, or live failed network states. Verify separately with controlled beta testers.
4. The signup recovery-code interstitial was deliberately removed by prior request. Username-only accounts created afterward do not receive usable recovery codes, so password recovery remains a launch risk.
