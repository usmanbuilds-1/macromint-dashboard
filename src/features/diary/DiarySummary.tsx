import { formatNumber } from "@/lib/utils";
import type { NutrientRecord } from "@/types";

/** One clear daily reading, plus supporting macro context; no decorative ring. */
export function DiarySummary({
  totals, calorieTarget, proteinTarget, hasEntries, loading,
  complete = { kcal: true, protein: true, carbs: true, fat: true },
}: {
  totals: NutrientRecord;
  calorieTarget: number | null;
  proteinTarget: number | null;
  hasEntries: boolean;
  loading: boolean;
  complete?: Record<"kcal" | "protein" | "carbs" | "fat", boolean>;
}) {
  const kcal = hasEntries ? totals.kcal ?? null : 0;
  const remaining = kcal !== null && calorieTarget !== null && complete.kcal ? calorieTarget - kcal : null;
  const percent = remaining !== null && calorieTarget! > 0
    ? Math.max(0, Math.min(100, (kcal! / calorieTarget!) * 100))
    : 0;
  const protein = hasEntries ? totals.protein ?? null : 0;
  return (
    <section className="mm-journey-ledger" aria-label="Diary totals">
      <div className="mm-journey-ledger-main">
        <div>
          <p className="mm-journey-eyebrow">CALORIES LOGGED</p>
          <p className="mm-journey-ledger-number tabular-nums">
            {loading ? "—" : kcal === null ? "—" : `${complete.kcal ? "" : "≥ "}${formatNumber(kcal)}`}
            <span>kcal</span>
          </p>
          <p className="mm-journey-ledger-note">
            {loading ? "Reading diary…" : !complete.kcal
              ? "Known calories only. Some foods have no calorie data."
              : kcal === null
              ? "Calories aren't available for every logged food."
              : remaining === null ? "Set a daily target in Goals to see your balance."
              : remaining < 0 ? `${formatNumber(Math.abs(remaining))} kcal above your target`
              : `${formatNumber(remaining)} kcal remaining of ${formatNumber(calorieTarget!)}`}
          </p>
        </div>
        <div className="mm-journey-ledger-side">
          <p className="mm-journey-eyebrow">PROTEIN</p>
          <p className="mm-journey-ledger-secondary tabular-nums">
            {loading || protein === null ? "—" : `${complete.protein ? "" : "≥ "}${formatNumber(protein)}`}<span>g</span>
          </p>
          <p className="mm-journey-ledger-note">
            {!complete.protein ? "Known amount only" : proteinTarget === null ? "No target set" : `of ${formatNumber(proteinTarget)} g`}
          </p>
        </div>
      </div>
      {complete.kcal && calorieTarget !== null && calorieTarget > 0 && kcal !== null && (
        <div className="mm-journey-ledger-track" role="progressbar" aria-label="Diary calorie progress"
          aria-valuemin={0} aria-valuenow={kcal} aria-valuemax={Math.max(calorieTarget, kcal, 1)}>
          <span style={{ width: `${percent}%` }}/>
        </div>
      )}
      <p className="mm-journey-ledger-foot tabular-nums">
        Carbs {hasEntries && totals.carbs == null ? "—" : `${complete.carbs ? "" : "≥ "}${formatNumber(totals.carbs ?? 0)}`} g
        <span aria-hidden="true"> · </span>
        Fat {hasEntries && totals.fat == null ? "—" : `${complete.fat ? "" : "≥ "}${formatNumber(totals.fat ?? 0)}`} g
      </p>
    </section>
  );
}
