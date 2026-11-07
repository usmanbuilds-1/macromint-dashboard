import { useMemo } from "react";
import type { DiaryEntry } from "@/types";
import { weeklyInsights } from "@/lib/nutrition/weekly-insights";
import { formatNumber } from "@/lib/utils";

/** Real logging evidence; no made-up streaks or calorie advice. */
export function WeeklySignals({ entries, today }: { entries: DiaryEntry[]; today: string }) {
  const insight = useMemo(() => weeklyInsights(entries, today), [entries, today]);
  if (!insight.totalEntries) return null;
  return (
    <section className="mm-weekly-signals" aria-label="Last seven days">
      <div className="mm-weekly-signals-heading">
        <h2>Last seven days</h2><span>From your food journal</span>
      </div>
      <dl className="mm-weekly-metrics">
        <div><dt>Days with food logged</dt><dd className="tabular-nums">{insight.daysLogged} <small>of 7</small></dd></div>
        <div><dt>Entries</dt><dd className="tabular-nums">{insight.totalEntries}</dd></div>
        <div><dt>Average recorded calories</dt><dd className="tabular-nums">{insight.averageRecordedCalories === null ? "—" : formatNumber(insight.averageRecordedCalories)} <small>{insight.averageRecordedCalories !== null && "kcal"}</small></dd></div>
      </dl>
      <p className="mm-feature-muted">
        Average uses only the {insight.completeCalorieDays} logged {insight.completeCalorieDays === 1 ? "day" : "days"} with complete calorie data. Unlogged days are excluded.
      </p>
      {insight.mostRepeatedFood && (
        <p className="mm-weekly-repeat"><strong>Repeated food</strong> {insight.mostRepeatedFood.name} · {insight.mostRepeatedFood.count} entries</p>
      )}
    </section>
  );
}
