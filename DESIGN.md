# Macro Mint — DESIGN.md

## Design intent
This document governs the existing Macro Mint nutrition website and app. It is a **mobile-first web application**, not a native mock phone. The approved visual reference is a Taste Skill v2 editorial redesign informed by the user's GLM demo: a balanced mint/deep-green and warm-white first screen, serif display typography, a real working React nutrition preview, restrained photography, and one primary green action. The public site and authenticated app must share brand and component logic, but marketing presentation must never replace functional screens. Create real React interfaces; never paste a flattened mockup into a site.

Read [TasteSkill v2](https://www.tasteskill.dev/) and the patterns in [Awesome DESIGN.md](https://github.com/voltagent/awesome-design-md). Audit the existing screens first, build within this system, screenshot at 390px and 1440px, then critique and revise.

## System
- Colors: marketing paper #f2f8f3; primary mint canvas #419f79; ink #112e24; primary dark green #075b3e; functional progress green #08704d; white #fff; muted ink #5e7166; subtle divider #d7e6da. Authenticated-app tokens remain coherent with the existing theme. Error and warning colors remain semantically distinct.
- Logo: two minimal overlapping mint leaves and “Macro Mint” wordmark. No generic square logo containers or ad hoc marks.
- Typography: Instrument Sans for UI, a well-kerned editorial serif (Georgia until a licensed option is chosen) for prominent marketing headlines, predictable 14–16px body, tabular figures for nutrition data. Avoid all-caps paragraphs and verbose labels.
- Geometry: 8–12px radii for everyday UI, 10px buttons, phone preview frames are editorial presentation only. No glassmorphism, decorative gradients, bento tiles, glowing borders, emoji UI, artificial testimonial blocks, 3-feature icon-in-colored-circles clichés or cheap vectors.
- Mobile: 375/390/430px primary, then 768 and 1440. Navigation, touch >=44px, safe-area and keyboard usability are release requirements. No horizontal scrolling; simple linear reading order.
- Pages: first desktop viewport uses a contained split-color hero (left sample daily preview, right editorial promise); **do not extend an empty colored column for the full page**. Below the first fold, use full-width alternating editorial sections with restrained illustrations/food photography. On mobile, hero text must precede the product preview. Do not substitute a flattened mockup for real working UI.
- App: Today = daily calories (single instrument), three macros, primary Log food and editable meal ledger. Search, scan, diary and admin must keep actual working routes/backends. Avoid multiple calorie visualizations on the same screen.
- Photography: authentic, properly licensed high-resolution food still-life, with warm light and accurate descriptions. Self-host WebP images with explicit dimensions and test their natural pixel dimensions. No fake people, lab verification or invented app screenshots. Image asset must be optimized, and responsive crop must be checked.
- Copy: concise and benefit led, e.g. “Track your food. Hit your goals.” / “Find foods, save favourites, or scan a meal.” Never repeat AI accuracy limitations in hero, features, FAQ, screenshots and onboarding: a single accessible disclosure can explain that photo-based nutrition suggestions are estimates and require portion review. Show source provenance precisely in *functional scan review*, not as repeated marketing anxiety.
- Sample figures: when public preview uses calorie/macro numbers, identify them as SAMPLE DATA and keep math internally consistent. The demo meal may rescale its nutrition according to chosen grams but must not imply persisted user diary data.
- Access: the web application is live for existing accounts, but self-service registration is NOT active until Lovable Cloud Email provider, owner bootstrap and invitation backend are configured. Never say “coming soon” about the entire live product, and never say “join now” when registration is gated.

## Verification
1. Do not change Supabase RLS, existing data or auth provider to implement a visual style.
2. Run tests, lint (excluding legacy formatting debt), TypeScript and build.
3. Browser audit landing/register at 375,390,430,768,1440; inspect screenshots, test portion slider with actual events. For authenticated Today/Diary, separately test against a real account after Auth is provisioned.
4. Never merge or publish a visual pass without reviewing actual browser screenshots against the Taste Skill editorial direction. Inspect mobile, tablet and desktop full pages, especially the hero-to-body transition and interactive-demo behavior.
5. GLM demo inspection found false customer testimonials, a fictional Food Trust Score, false lab A-grades, 80+ tracked nutrients, unimplemented voice/barcode logging, dietitian/clinician sharing, fake pricing, “free forever” and “no ads.” These claims and mock capabilities are **prohibited** until independently implemented, sourced and verified. The GLM demo is a visual reference only, not a trusted product source.
