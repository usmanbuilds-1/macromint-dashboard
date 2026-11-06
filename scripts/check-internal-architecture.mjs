import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

/** Architectural guardrail: keep new UX and data fetching out of legacy
 * monoliths. Pre-existing larger files are capped, not treated as models. */
const budgets = {
  "src/features/foods/FoodEntryChooser.tsx": 120,
  "src/features/scan/ScanCapture.tsx": 145,
  "src/features/scan/ScanReview.tsx": 165,
  "src/features/scan/ScanDialog.tsx": 250,
  "src/features/foods/FoodLogProvider.tsx": 165,
  "src/lib/backend/supabase/diary-range.ts": 100,
  "src/styles/internal-polish.css": 220,
  "src/hooks/useCachedData.ts": 80,
  "src/hooks/useAppDataInvalidation.ts": 60,
  "src/hooks/usePrimaryRoutePreload.ts": 80,
  "src/features/trends/WeeklyArchive.tsx": 135,
  "src/features/trends/Trends.tsx": 330,
  "src/lib/backend/supabase/saved-meal-log.ts": 100,
  // Legacy debt: do not grow these files. Split domain code first.
  "src/lib/backend/supabase-backend.ts": 990,
  "src/styles.css": 1720,
  "src/features/admin/Admin.tsx": 495,
};
for (const [path, maxLines] of Object.entries(budgets)) {
  const lines = readFileSync(path, "utf8").trimEnd().split("\n").length;
  assert.ok(lines <= maxLines,
    `${path} is ${lines} lines, exceeding module budget ${maxLines}; extract a focused component instead.`);
  console.log(`PASS module budget ${lines}/${maxLines} ${path}`);
}
const shell = readFileSync("src/components/app/AppLayout.tsx", "utf8");
for (const name of ["FoodSearchDialog", "ServingConfigHost", "ScanDialog"]) {
  assert.match(shell, new RegExp(`lazy\\(\\(\\) =>[\\s\\S]*?import\\("@/features/[^"]+/${name}"\\)`));
}
const progress = readFileSync("src/features/trends/Trends.tsx", "utf8");
assert.match(progress, /backend\.getDiaryRange\(/);
assert.doesNotMatch(progress, /Promise\.all\(rangeDates\.map/);
const weekly = readFileSync("src/features/trends/WeeklyArchive.tsx", "utf8");
const backend = readFileSync("src/lib/backend/supabase-backend.ts", "utf8");
assert.doesNotMatch(progress, /backend\.getDiary\(/,
  "Progress must never fetch calendar days one by one");
assert.doesNotMatch(weekly, /backend\.|useAsyncData/,
  "Weekly archive must derive from the shared progress range");
assert.match(backend, /logSavedMealBatch\(/,
  "Saved meal logging must use one atomic batch instead of N inserts");
assert.doesNotMatch(backend.slice(backend.indexOf("async logSavedMeal("), backend.indexOf("async getDiary(")),
  /for\s*\(/, "Do not reintroduce per-food insertion loops");
console.log("PASS: tab data caching, no weekly N+1 reads, and atomic saved-meal batch");
