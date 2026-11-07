import { Link } from "@tanstack/react-router";
import type { NutrientRecord } from "@/types";
import { formatNumber } from "@/lib/utils";

type DailyGoal = number | null;

function MacroMeasure({
  name, value, target, emphasis = false, loading, complete,
}: {
  name: string;
  value: number | null;
  target: DailyGoal;
  emphasis?: boolean;
  loading: boolean;
  complete: boolean;
}) {
  const percentage = value !== null && target !== null && target > 0
    ? Math.min(100, Math.max(0, (value / target) * 100))
    : 0;

  return (
    <div className={`mm-home-macro ${emphasis ? "mm-home-macro--primary" : ""}`}>
      <dt className="mm-home-macro-label">{name}</dt>
      <dd className="mm-home-macro-value tabular-nums">
        <strong>{loading || value === null ? "—" : `${complete ? "" : "≥ "}${formatNumber(value)}`}</strong>
        <span>g</span>
      </dd>
      {complete && <div className="mm-home-macro-track" role="progressbar"
        aria-label={`${name} logged`}
        aria-valuemin={0}
        aria-valuenow={value ?? 0}
        aria-valuemax={Math.max(target ?? 0, value ?? 0, 1)}>
        <span style={{ width: `${percentage}%` }} />
      </div>}
      <p className="mm-home-macro-target tabular-nums">
        {!complete ? "Known amount only" : target === null ? "No target set" : `of ${formatNumber(target)} g`}
      </p>
    </div>
  );
}

/** Editorial ledger, not a decorative calorie dashboard.
 * The day and targets are real account values; the progress bar never
 * invents missing nutrient measurements.
 */
export function TodayOverview({
  totals, target, proteinTarget, carbsTarget, fatTarget, loading, hasEntries,
  complete = { kcal: true, protein: true, carbs: true, fat: true },
}: {
  totals: NutrientRecord;
  target: DailyGoal;
  proteinTarget: DailyGoal;
  carbsTarget: DailyGoal;
  fatTarget: DailyGoal;
  loading: boolean;
  hasEntries: boolean;
  complete?: Record<"kcal" | "protein" | "carbs" | "fat", boolean>;
}) {
  const energy = totals.kcal ?? null;
  const consumed = energy ?? 0;
  const targetReady = target !== null && target > 0;
  const difference = targetReady && energy !== null && complete.kcal ? target - consumed : null;
  const percentage = difference !== null
    ? Math.min(100, Math.max(0, (consumed / target!) * 100))
    : 0;

  const context = loading
    ? "Reading today's food log."
    : !hasEntries
      ? "No food logged yet. Add a meal to begin."
      : energy === null
        ? "Calories aren't available for the foods entered yet."
        : !complete.kcal
          ? "Known calories only. Some foods have no energy data, so remaining calories cannot be calculated."
        : !targetReady
          ? "Add a calorie target to see your daily balance."
          : difference! > 0
            ? `${formatNumber(difference!)} kcal to your daily target.`
            : difference === 0
              ? "You've reached your daily target."
              : `${formatNumber(Math.abs(difference!))} kcal above your daily target.`;

  const nutrient = (key: "protein" | "carbs" | "fat") =>
    !hasEntries ? 0 : totals[key] ?? null;

  if (!hasEntries && !loading) {
    return (
      <section aria-labelledby="daily-intake-heading" className="mm-home-overview mm-home-overview--empty">
        <div className="mm-home-day-facts">
          <div>
            <p className="mm-home-fact-label">Logged today</p>
            <p className="mm-home-fact-value tabular-nums"><strong>0</strong> <span>kcal</span></p>
          </div>
          <div className="mm-home-day-target">
            <h2 id="daily-intake-heading" className="mm-home-fact-label">Daily target</h2>
            {targetReady
              ? <p className="mm-home-fact-value tabular-nums"><strong>{formatNumber(target!)}</strong> <span>kcal</span></p>
              : <Link to="/goals" className="mm-home-overview-link">Set targets</Link>}
          </div>
        </div>
        {targetReady && <div className="mm-home-energy-track" role="progressbar"
          aria-label="Daily calorie progress" aria-valuemin={0} aria-valuenow={0} aria-valuemax={target!}>
          <span style={{ width: "0%" }} />
        </div>}
        {(proteinTarget !== null || carbsTarget !== null || fatTarget !== null) && (
          <dl className="mm-home-macro-plan" aria-label="Daily macro targets">
            {([
              ["Protein", proteinTarget], ["Carbs", carbsTarget], ["Fat", fatTarget],
            ] as const).map(([label, amount]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className="tabular-nums">{amount === null ? "Not set" : `${formatNumber(amount)} g`}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="daily-intake-heading" className="mm-home-overview">
      <div className="mm-home-overview-heading">
        <h2 id="daily-intake-heading">Today’s nutrition</h2>
        {target === null && (
          <Link to="/goals" className="mm-home-overview-link">Set your targets</Link>
        )}
      </div>

      <div className="mm-home-calorie-line">
        <div className="mm-home-calorie-main">
          <p className="mm-home-overline">EATEN TODAY</p>
          <div className="mm-home-calorie-figure">
            <strong className="mm-home-calories tabular-nums">
              {loading ? "—" : !hasEntries ? "0" : energy === null ? "—" : `${complete.kcal ? "" : "≥ "}${formatNumber(consumed)}`}
            </strong>
            <span>kcal</span>
          </div>
        </div>
        <div className="mm-home-calorie-aside">
          <p className="mm-home-overline">DAILY TARGET</p>
          <p className="mm-home-target-value tabular-nums">
            {targetReady ? formatNumber(target!) : "Not set"}
            {targetReady && <span> kcal</span>}
          </p>
          {difference !== null && (
            <p className="mm-home-target-detail">
              {difference > 0 ? "Remaining" : difference === 0 ? "On target" : "Above target"}
            </p>
          )}
        </div>
      </div>

      <p className={`mm-home-balance-copy ${!hasEntries ? "mm-home-balance-copy--empty" : ""}`} role="status">{context}</p>

      {targetReady && complete.kcal && (
        <div className="mm-home-energy-track" role="progressbar"
          aria-label="Daily calorie progress"
          aria-valuemin={0} aria-valuenow={consumed}
          aria-valuemax={Math.max(target!, consumed, 1)}>
          <span style={{ width: `${percentage}%` }} />
        </div>
      )}

      {hasEntries && <dl className="mm-home-macro-grid" aria-label="Daily macronutrients">
        <MacroMeasure name="Protein" value={nutrient("protein")} target={proteinTarget} emphasis loading={loading} complete={complete.protein} />
        <MacroMeasure name="Carbs" value={nutrient("carbs")} target={carbsTarget} loading={loading} complete={complete.carbs} />
        <MacroMeasure name="Fat" value={nutrient("fat")} target={fatTarget} loading={loading} complete={complete.fat} />
      </dl>}
    </section>
  );
}
