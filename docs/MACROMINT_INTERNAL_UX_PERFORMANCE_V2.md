# Macro Mint — internal UX and performance pass

Reference systems: [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) and [TasteSkill](https://github.com/Leonxlnx/taste-skill) in **app-screen mode**, not its landing-page hero treatment. The target is a calm, confidence-building nutrition journal; use Macro Mint's existing cream, dark-green and Instrument Sans language. No glassmorphism, bento dashboard, fake statistics, gradients, glowing borders, or decorative icon spam.

## Evidence and screenshot protocol

The CI workflow `.github/workflows/mobile-browser.yml` runs against an **isolated demo build** with all live backend environment variables removed. It creates a local fake account, completes onboarding, navigates internal pages and captures each at **390 × 844**, **768 × 1024** and **1440 × 900**. Files are attached to the workflow under `mobile-browser-screenshots/mobile-audit/screens/`, together with `metrics.json` (DOM, resource requests, transferred KB).

| Screen captured | Visual standard |
| --- | --- |
| Login and signup | One job per screen; no authenticated app payload in login's logo import |
| Onboarding basics, goal, activity, targets | Four coherent steps; feet/inches + kg for Pakistan; no exposed activity coefficients |
| Today | Calorie progress leads; explicit Add food; empty-state next action |
| Add-food choice | Search/type versus photo without surprise keyboard |
| Photo choices | Camera/gallery and text alternative visible; optional notes collapsed |
| Food search | Search is only focused after the user chooses text entry |
| Diary | Direct add + scan, by-meal grouping and usable date controls |
| Foods | Search, favourites and clear custom food path |
| Progress | One bounded diary query instead of up to 30 independent network calls |
| Goals | Editable daily targets clearly distinguished from recalculating |
| Weight | Single goal and trend flow with consistent kg storage |
| Settings | Plain-language profile, privacy and export hierarchy |
| Admin users, audit, settings | Operational tables and choices; no decorative dashboard cards |
| Restricted account | Trial status, privacy controls and tester-only extensions |
| Terms, Privacy | Readable content and intact routes |

Any failing width aborts the workflow with exact offending element geometry. The test checks focus state on the scan/photo chooser and verifies the camera-only `capture` attribute is absent from gallery input. Do not assume screenshot capture is the same as an expert manual visual critique; the generated artifacts are available for visual review.

## Architecture and performance decisions

1. Extracted `BrandMark` so Login/Onboarding don't import the entire authenticated shell just to draw a logo.
2. `AppLayout` lazy-loads `FoodSearchDialog`, `ServingConfigHost` and `ScanDialog` only on demand and no longer rerenders for unrelated data mutations.
3. Split scan work into `ScanCapture` (selection), `ScanReview` (estimates and portion editing) and a short orchestration `ScanDialog`. New `FoodEntryChooser` owns the initial keyboard-free choice.
4. `Trends` uses `backend.getDiaryRange`; Supabase paginates within the current user's RLS scope, while the demo backend filters by user and date.
5. `prepareImage` bounds image size and pixels, provides a Safari image fallback and releases decoded memory after encoding.
6. Screens use their established page modules. App-specific polish lives in the separate `src/styles/internal-polish.css`, avoiding further expansion of the legacy 1,700+ line global stylesheet.
7. `scripts/check-internal-architecture.mjs` sets size budgets on new components and prevents preexisting large source files from growing without extraction. Legacy backend and global CSS still need further decomposition; do not claim they're magically eliminated.

## Known limitations

- CI demo screenshots are not equivalent to a real 2-user Cloud/RLS or scan API end-to-end test. Backend migrations and Edge functions were deliberately untouched.
- Browser screenshot comparison is a visual QA artifact, not a pixel-perfect generated design image. New UI is rendered directly by the React components.
- User requested the recovery-code screen to be removed; new username-only accounts still lack a convenient self-service recovery mechanism. Do not market this as fully solved.
- For genuine real-world performance numbers, collect field data under user consent; CI CPU times and transfer counts are directional rather than a guarantee across Pakistani mobile networks.

## Release gate

- TypeScript, unit tests, ESLint, backend SQL release contracts and auth checks pass.
- The mobile browser and isolated demo captures pass at all target widths with no runtime exceptions or excessive horizontal overflow.
- No live SQL migrations, secrets, account creation or automatic publishing from this pull request.
