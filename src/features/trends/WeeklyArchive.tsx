import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adherenceStats, daysToKcal } from "@/lib/nutrition/math";
import { weekLabel } from "@/lib/nutrition/datetime";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { DiaryEntry } from "@/types";

/** Build four weekly summaries in memory from the ONE account-scoped
 * diary-range result already used by the Progress screen. No per-day calls.
 */
export function buildWeeklyHistory(weeks: string[][], entries: DiaryEntry[], target: number) {
  const byDate = new Map<string, DiaryEntry[]>();
  for (const entry of entries) {
    const day = byDate.get(entry.entryDate);
    if (day) day.push(entry);
    else byDate.set(entry.entryDate, [entry]);
  }
  return weeks.map((dates) => {
    const all = dates.flatMap((date) => byDate.get(date) ?? []);
    return { dates, stats: adherenceStats(daysToKcal(all, dates), target) };
  });
}

export function WeeklyArchive({
  weeks, entries, target, loading, error, reload,
}: {
  weeks: string[][];
  entries: DiaryEntry[] | null;
  target: number | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}) {
  const summaries = useMemo(
    () => entries ? buildWeeklyHistory(weeks, entries, target ?? 1) : null,
    [weeks, entries, target],
  );

  return (
    <section aria-label="Weekly history" className="mm-journey-weekly overflow-hidden border-y">
      <div className="border-b px-2 py-3">
        <h2 className="text-sm font-semibold">Week by week</h2>
      </div>
      {loading && !summaries && (
        <p role="status" className="px-4 py-4 text-sm text-muted-foreground">Loading weekly history…</p>
      )}
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          Weekly history unavailable.
          <Button variant="outline" size="sm" onClick={reload}>Retry</Button>
        </div>
      )}
      {summaries?.map(({ dates, stats }) => (
        <div key={dates[0]} className="flex items-center justify-between gap-3 border-t px-4 py-3 first:border-t-0">
          <div>
            <p className="text-sm font-medium">{weekLabel(dates)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {stats.loggedDays === 0
                ? "Nothing logged"
                : `${stats.loggedDays}/7 days logged · avg ${formatNumber(stats.averageKcalLogged ?? 0)} kcal`}
            </p>
          </div>
          {target !== null && target > 0 && stats.adherencePct !== null && (
            <Badge variant="outline" className={cn("shrink-0",
              stats.label === "consistent" && "border-primary/40 text-primary",
              stats.label === "over" && "border-macro-fat/40 text-macro-fat",
              stats.label === "under" && "border-warning/40 text-warning",
            )}>
              {stats.adherencePct}% on target
            </Badge>
          )}
        </div>
      ))}
    </section>
  );
}
