import { addDaysStr as addDaysStrLocal } from "@/lib/nutrition/datetime";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/context/Session";
import { backend } from "@/lib/backend";
import { useAsyncData } from "@/hooks/useData";
import { WeeklyArchive } from "./WeeklyArchive";
import { EmptyChart } from "./EmptyChart";
import { adherenceStats, daysToKcal } from "@/lib/nutrition/math";
import { summarizeNutrientCoverage } from "@/lib/nutrition/coverage";
import { lastNWeeks, weekDates, formatDateShort, todayStr } from "@/lib/nutrition/datetime";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { JourneyIntro } from "@/components/app/JourneyIntro";
import { JourneyEmpty } from "@/components/app/JourneyEmpty";

const RANGE_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
] as const;

export function Trends() {
  const { goals } = useSession();
  const [range, setRange] = useState<number>(14);
  const today = todayStr();

  const weight = useAsyncData(() => backend.getWeights(90), [], "weights:90");
  const weights = weight.data ?? [];
  const rangeDates = useMemo(
    () => Array.from({ length: range }, (_, i) => addDaysStrLocal(today, -(range - 1 - i))),
    [today, range],
  );

  // One bounded read supplies BOTH the selected charts and all four
  // calendar-week summaries. Changing 7/14/30 days is now entirely local.
  const weeks = useMemo(() => lastNWeeks(today, 4), [today]);
  const oldestChartDay = addDaysStrLocal(today, -29);
  const firstArchiveDay = weeks[0]?.[0] ?? oldestChartDay;
  const historyStart = firstArchiveDay < oldestChartDay ? firstArchiveDay : oldestChartDay;
  const history = useAsyncData(
    () => backend.getDiaryRange(historyStart, today),
    [historyStart, today],
    "progress:diary-range",
  );
  const diaryData = useMemo(() => ({
    data: history.data
      ? {
          all: history.data.filter((entry) =>
            entry.entryDate >= (rangeDates[0] ?? today) && entry.entryDate <= today),
          dates: rangeDates,
        }
      : null,
    loading: history.loading,
    error: history.error,
    reload: history.reload,
  }), [history.data, history.loading, history.error, history.reload, rangeDates, today]);

  const kcalByDay = useMemo(() => {
    if (!diaryData.data) return [];
    return daysToKcal(diaryData.data.all, diaryData.data.dates);
  }, [diaryData.data]);

  const adherence = useMemo(
    () => adherenceStats(kcalByDay.map((d) => ({ date: d.date, kcal: d.kcal })), goals?.calorieTarget ?? 2000),
    [kcalByDay, goals],
  );

  const weightChart = useMemo(
    () =>
      [...weights]
        .reverse()
        .slice(-30)
        .map((w) => ({ date: formatDateShort(w.entryDate), weight: w.weightKg })),
    [weights],
  );

  const weightTrend = useMemo(() => {
    if (weights.length < 2) return null;
    const sorted = [...weights].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) return null;
    const days = Math.max((Date.parse(last.entryDate) - Date.parse(first.entryDate)) / 86_400_000, 1);
    const perWeek = ((last.weightKg - first.weightKg) / days) * 7;
    return { perWeek, delta: last.weightKg - first.weightKg };
  }, [weights]);

  const macroTotals = useMemo(() => {
    const entries = diaryData.data?.all ?? [];
    if (!entries.length) return null;
    const protein = summarizeNutrientCoverage(entries, "protein").completeDayAmount;
    const carbs = summarizeNutrientCoverage(entries, "carbs").completeDayAmount;
    const fat = summarizeNutrientCoverage(entries, "fat").completeDayAmount;
    // Missing nutrient fields are unknown, not zero: do not misrepresent
    // an incomplete diary as a trustworthy macro energy distribution.
    if (protein === null || carbs === null || fat === null) return null;
    return { protein, carbs, fat };
  }, [diaryData.data]);

  const noHistory = !diaryData.loading && !weight.loading && !diaryData.error && !weight.error &&
    diaryData.data?.all.length === 0 && weights.length === 0;

  const loggedDaysInRange = new Set((diaryData.data?.all ?? []).map((entry) => entry.entryDate)).size;

  const macroEnergy = macroTotals
    ? macroTotals.protein * 4 + macroTotals.carbs * 4 + macroTotals.fat * 9
    : 0;
  const macroShare = macroTotals && macroEnergy > 0
    ? {
        protein: Math.round(((macroTotals.protein * 4) / macroEnergy) * 100),
        carbs: Math.round(((macroTotals.carbs * 4) / macroEnergy) * 100),
        fat: Math.round(((macroTotals.fat * 9) / macroEnergy) * 100),
      }
    : null;

  return (
    <div className="mm6-subpage mm6-page-trends ref-live-progress flex flex-col gap-6">
      <JourneyIntro
        eyebrow="THE LONGER VIEW"
        title="Progress"
        description="See calorie and weight patterns as you log. Days without food entries are not counted as zero."
        action={diaryData.data?.all.length ? (
          <Tabs value={String(range)} onValueChange={(value) => setRange(Number(value))}>
            <TabsList aria-label="Progress period">
              {RANGE_OPTIONS.map((option) => (
                <TabsTrigger key={option.value} value={String(option.value)}>{option.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : undefined}
      />

      {diaryData.loading && !diaryData.data && (
        <p role="status" className="text-sm text-muted-foreground">Loading your nutrition history…</p>
      )}
      {diaryData.error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-destructive/30 p-3 text-sm">
          Nutrition history could not load.
          <Button variant="outline" size="sm" onClick={diaryData.reload}>Retry</Button>
        </div>
      )}
      {weight.error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-destructive/30 p-3 text-sm">
          Your weight history could not load.
          <Button variant="outline" size="sm" onClick={weight.reload}>Retry</Button>
        </div>
      )}
      {noHistory && (
        <JourneyEmpty
          title="Your progress starts with a log"
          description="Log a meal or record your weight. As you add entries, the charts will show what changes."
          supporting={(
            <div className="mm-journey-empty-links">
              <Link to="/diary" className="inline-flex min-h-11 items-center rounded bg-primary px-4 text-sm font-semibold text-primary-foreground">Log food</Link>
              <Link to="/weight" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4">Record weight</Link>
            </div>
          )}
        />
      )}

      {!noHistory && (
        <>

      {/* Calorie trend */}
      {(diaryData.data?.all.length ?? 0) > 0 && <section id="ref-calorie-trend" className="border-b bg-card/0 pb-6" aria-label="Calorie trend">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Daily calories</h2>
          {goals?.calorieTarget != null && adherence.adherencePct !== null ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge
                variant="outline"
                className={cn(
                  adherence.label === "consistent" && "border-primary/40 text-primary",
                  adherence.label === "over" && "border-macro-fat/40 text-macro-fat",
                  adherence.label === "under" && "border-warning/40 text-warning",
                )}
              >
                {adherence.label === "consistent" ? "Consistent" : adherence.label === "under" ? "Under target" : "Over target"}
              </Badge>
              <span className="tabular-nums">
                {adherence.onTargetDays}/{adherence.loggedDays} logged days on target · avg {formatNumber(adherence.averageKcalLogged ?? 0)} kcal
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Log meals to see your pattern</span>
          )}
        </div>
        <div className="mt-4 h-56">
          {kcalByDay.every((d) => d.kcal === null) ? (
            <EmptyChart message="No calories logged in this range yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kcalByDay} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" minTickGap={18} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <ChartTooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => [`${formatNumber(Number(value))} kcal`, "Calories"]}
                />
                {goals?.calorieTarget != null && (
                  <ReferenceLine y={goals.calorieTarget} stroke="var(--primary)" strokeDasharray="6 4" />
                )}
                <Bar dataKey="kcal" fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Food logged on {loggedDaysInRange} of the last {range} days.
          {goals?.calorieTarget != null && ` Dashed line: ${formatNumber(goals.calorieTarget)} kcal target.`}
        </p>
      </section>}

      <div className="mm-journey-progress-secondary grid gap-6">
        {/* Weight */}
        {weights.length > 0 && <section id="ref-weight-trend" className="border-b pb-6" aria-label="Weight trend">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Weight</h2>
            <Link to="/weight" className="inline-flex min-h-10 items-center text-xs font-medium text-primary underline underline-offset-4">Weight log &amp; goals</Link>
          </div>
          {weights.length === 0 ? (
            <div className="mt-4">
              <EmptyChart message="No weights yet. Add one to start the trend." />
            </div>
          ) : (
            <>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightChart} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} domain={["auto", "auto"]} />
                    <ChartTooltip
                      contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                      formatter={(value) => [`${formatNumber(Number(value), 1)} kg`, "Weight"]}
                    />
                    <Line type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2.5, fill: "var(--primary)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {weightTrend && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {weightTrend.delta === 0
                    ? "No change since your first entry."
                    : `${weightTrend.delta > 0 ? "+" : ""}${formatNumber(weightTrend.delta, 1)} kg overall, about ${weightTrend.perWeek > 0 ? "+" : ""}${formatNumber(weightTrend.perWeek, 2)} kg per week. Recent points only are shown on the chart.`}
                </p>
              )}
            </>
          )}
        </section>}

        <details className="mm-progress-detail mt-2 border-t pt-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary">More insights: macros and weekly history</summary>
        {/* Macro distribution */}
        <section id="ref-macro-trend" className="border-b pb-6" aria-label="Macro distribution">
          <h2 className="text-sm font-semibold">Energy from macros</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Share of logged energy in this range</p>
          {macroShare ? (
            <>
              <div className="mt-5 flex h-3 overflow-hidden rounded-full">
                <div className="bg-primary" style={{ width: `${macroShare.protein}%` }} />
                <div className="bg-primary/60" style={{ width: `${macroShare.carbs}%` }} />
                <div className="bg-primary/25" style={{ width: `${macroShare.fat}%` }} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <dt className="text-xs text-muted-foreground">Protein</dt>
                  <dd className="text-lg font-semibold tabular-nums">{macroShare.protein}%</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Carbs</dt>
                  <dd className="text-lg font-semibold tabular-nums">{macroShare.carbs}%</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Fat</dt>
                  <dd className="text-lg font-semibold tabular-nums">{macroShare.fat}%</dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="mt-4">
              <EmptyChart message={
                diaryData.data?.all.length && !macroTotals
                  ? "Some logged foods are missing macro values. The breakdown is unavailable until those values are recorded."
                  : diaryData.data?.all.length
                    ? "No calculable macro energy was logged in this range."
                    : "Log meals to see your macro split."
              } />
            </div>
          )}
        </section>

      {/* Weekly archive */}
      <WeeklyArchive
        weeks={weeks}
        entries={history.data}
        target={goals?.calorieTarget ?? null}
        loading={history.loading}
        error={history.error}
        reload={history.reload}
      />
        </details>
      </div>
      </>
      )}
    </div>
  );
}

export { weekDates };
