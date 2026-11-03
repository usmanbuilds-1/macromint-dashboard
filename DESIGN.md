# Macro Mint — DESIGN.md

## Design intent
This document governs the existing Macro Mint nutrition website and app. It is a **mobile-first web application**, not a native mock phone. The approved visual reference is Concept 2: warm-white editorial canvas, deep-green headings, real food photography, a branded two-leaf mark, crisp macro instrumentation and one green CTA. Create real React interfaces; never paste a flattened mockup into a site.

Read [TasteSkill v2](https://www.tasteskill.dev/) and the patterns in [Awesome DESIGN.md](https://github.com/voltagent/awesome-design-md). Audit the existing screens first, build within this system, screenshot at 390px and 1440px, then critique and revise.

## System
- Colors: canvas warm white #fbfcfa; ink #112d23; primary deep green #09643f; progress green #1d9368; white #fff; secondary ink #506158; dividers #e6ebe7. Error and warning colors remain semantically distinct.
- Logo: two minimal overlapping mint leaves and “Macro Mint” wordmark. No generic square logo containers or ad hoc marks.
- Typography: Instrument Sans or equivalent legible modern sans, compact tracking on editorial headlines, predictable 14–16px body, tabular figures for nutrition data. Avoid all-caps paragraphs and verbose labels.
- Geometry: 8–12px radii for everyday UI, 10px buttons, phone preview frames are editorial presentation only. No glassmorphism, decorative gradients, bento tiles, glowing borders, emoji UI, artificial testimonial blocks, 3-feature icon-in-colored-circles clichés or cheap vectors.
- Mobile: 375/390/430px primary, then 768 and 1440. Navigation, touch >=44px, safe-area and keyboard usability are release requirements. No horizontal scrolling; simple linear reading order.
- Pages: first viewport = brand, one clear promise, 2 CTAs, high-quality food photography and working UI proof. Never substitute plain text for the approved visual hero.
- App: Today = daily calories (single instrument), three macros, primary Log food and editable meal ledger. Search, scan, diary and admin must keep actual working routes/backends. Avoid multiple calorie visualizations on the same screen.
- Photography: original natural-light editorial food still-life, warm cream tabletop and muted forest-green linen, human-authentic imperfect textures. No generated people, false data, fake lab verification or invented app screenshots. Image asset must be optimized, and responsive crop must be checked.
- Copy: concise and benefit led, e.g. “Track your food. Hit your goals.” / “Find foods, save favourites, or scan a meal.” Never repeat AI accuracy limitations in hero, features, FAQ, screenshots and onboarding: a single accessible disclosure can explain that photo-based nutrition suggestions are estimates and require portion review. Show source provenance precisely in *functional scan review*, not as repeated marketing anxiety.
- Sample figures: when public preview uses calorie/macro numbers, identify them as SAMPLE DATA and keep math internally consistent. The demo meal may rescale its nutrition according to chosen grams but must not imply persisted user diary data.
- Access: account registration is NOT active until Lovable Cloud Email provider, owner bootstrap and invite code backend are configured; “Beta opening soon” is a truthful release state, not a failure.

## Verification
1. Do not change Supabase RLS, existing data or auth provider to implement a visual style.
2. Run tests, lint (excluding legacy formatting debt), TypeScript and build.
3. Browser audit landing/register at 375,390,430,768,1440; inspect screenshots, test portion slider with actual events. For authenticated Today/Diary, separately test against a real account after Auth is provisioned.
4. Never merge or publish a visual pass without reviewing how the actual browser render compares to Concept 2.
