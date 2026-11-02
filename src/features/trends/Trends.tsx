import { useMemo, useState } from "react";
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
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/context/Session";
import { backend, bumpData } from "@/lib/backend";
import { useAsyncData, useDataVersion } from "@/hooks/useData";
import { adherenceStats, daysToKcal } from "@/lib/nutrition/math";
import { lastNWeeks, weekDates, weekLabel, formatDateShort, todayStr } from "@/lib/nutrition/datetime";
import { formatNumber } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
] as const;

export function Trends() {
  const { goals } = useSession();
  const version = useDataVersion();
  const [range, setRange] = useState<number>(14);
  const today = todayStr();

  const weight = useAsyncData(() => backend.getWeights(90), [version]);
  const weights = weight.data ?? [];
  const rangeDates = useMemo(
    () => Array.from({ length: range }, (_, i) => addDaysStrLocal(today, -(range - 1 - i))),
    [today, range],
  );

  const diaryData = useAsyncData(async () => {
    // Diary across the range: fetch day by day (bounded by the range length).
    const days = await Promise.all(rangeDates.map((d) => backend.getDiary(d)));
    const all = days.flat();
    return { all, dates: rangeDates };
  }, [version, range]);

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
    const days = Math.max((Date.parse(last.entryDate) - Date.parse(first.entryDate)) / 86_400_000, 1);
    const perWeek = ((last.weightKg - first.weightKg) / days) * 7;
    return { perWeek, delta: last.weightKg - first.weightKg };
  }, [weights]);

  const macroTotals = useMemo(() => {
    if (!diaryData.data) return { protein: 0, carbs: 0, fat: 0 };
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    for (const e of diaryData.data.all) {
      protein += e.nutrients.protein ?? 0;
      carbs += e.nutrients.carbs ?? 0;
      fat += e.nutrients.fat ?? 0;
    }
    return { protein, carbs, fat };
  }, [diaryData.data]);

  const macroEnergy = macroTotals.protein * 4 + macroTotals.carbs * 4 + macroTotals.fat * 9;
  const macroShare = macroEnergy > 0
    ? {
        protein: Math.round(((macroTotals.protein * 4) / macroEnergy) * 100),
        carbs: Math.round(((macroTotals.carbs * 4) / macroEnergy) * 100),
        fat: Math.round(((macroTotals.fat * 9) / macroEnergy) * 100),
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trends</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">How your nutrition behaves over time, from real logged data.</p>
        </div>
        <Tabs value={String(range)} onValueChange={(v) => setRange(Number(v))}>
          <TabsList>
            {RANGE_OPTIONS.map((r) => (
              <TabsTrigger key={r.value} value={String(r.value)}>{r.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      {/* Calorie trend */}
      <section className="rounded-xl border bg-card p-5" aria-label="Calorie trend">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Daily calories</h2>
          {adherence.adherencePct !== null ? (
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
                <ReferenceLine y={goals?.calorieTarget ?? 2000} stroke="var(--primary)" strokeDasharray="6 4" />
                <Bar dataKey="kcal" fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Dashed line: your {formatNumber(goals?.calorieTarget ?? 2000)} kcal target.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weight */}
        <section className="rounded-xl border bg-card p-5" aria-label="Weight trend">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Weight</h2>
            <AddWeightButton />
          </div>
          {weights.length === 0 ? (
            <div className="mt-4">
              <EmptyChart message="No weigh-ins yet. Add one to start the trend." />
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
                    <Line type="monotone" dataKey="weight" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 2.5, fill: "var(--chart-2)" }} />
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
        </section>

        {/* Macro distribution */}
        <section className="rounded-xl border bg-card p-5" aria-label="Macro distribution">
          <h2 className="text-sm font-semibold">Energy from macros</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Share of logged energy in this range</p>
          {macroShare ? (
            <>
              <div className="mt-5 flex h-3 overflow-hidden rounded-full">
                <div className="bg-macro-protein" style={{ width: `${macroShare.protein}%` }} />
                <div className="bg-macro-carbs" style={{ width: `${macroShare.carbs}%` }} />
                <div className="bg-macro-fat" style={{ width: `${macroShare.fat}%` }} />
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
              <EmptyChart message="Log meals to see your macro split." />
            </div>
          )}
        </section>
      </div>

      {/* Weekly archive */}
      <WeeklyArchive target={goals?.calorieTarget ?? 2000} version={version} />
    </div>
  );
}

function WeeklyArchive({ target, version }: { target: number; version: number }) {
  const today = todayStr();
  const weeks = useMemo(() => lastNWeeks(today, 4), [today]);

  const data = useAsyncData(async () => {
    const perWeek = await Promise.all(
      weeks.map(async (dates) => {
        const days = await Promise.all(dates.map((d) => backend.getDiary(d)));
        const all = days.flat();
        const stats = adherenceStats(daysToKcal(all, dates), target);
        return { dates, stats };
      }),
    );
    return perWeek;
  }, [version, target]);

  return (
    <section aria-label="Weekly history" className="overflow-hidden rounded-xl border">
      <div className="border-b bg-secondary/40 px-4 py-2.5">
        <h2 className="text-sm font-semibold">Week by week</h2>
      </div>
      {data.loading && <p className="px-4 py-4 text-sm text-muted-foreground">Loading…</p>}
      {data.data?.map(({ dates, stats }) => (
        <div key={dates[0]} className="flex items-center justify-between gap-3 border-t px-4 py-3 first:border-t-0">
          <div>
            <p className="text-sm font-medium">{weekLabel(dates)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {stats.loggedDays === 0
                ? "Nothing logged"
                : `${stats.loggedDays}/7 days logged · avg ${formatNumber(stats.averageKcalLogged ?? 0)} kcal`}
            </p>
          </div>
          {stats.adherencePct !== null && (
            <Badge
              variant="outline"
              className={cn(
                "shrink-0",
                stats.label === "consistent" && "border-primary/40 text-primary",
                stats.label === "over" && "border-macro-fat/40 text-macro-fat",
                stats.label === "under" && "border-warning/40 text-warning",
              )}
            >
              {stats.adherencePct}% on target
            </Badge>
          )}
        </div>
      ))}
    </section>
  );
}

function AddWeightButton() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const today = todayStr();

  const submit = async () => {
    const kg = Number(value);
    if (!Number.isFinite(kg) || kg < 20 || kg > 500) {
      toast.error("Enter a weight in kilograms between 20 and 500");
      return;
    }
    setBusy(true);
    try {
      await backend.addWeight(today, Math.round(kg * 10) / 10);
      bumpData();
      toast.success("Weight recorded");
      setOpen(false);
      setValue("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Add weigh-in
      </Button>
      <Dialog open={open} onOpenChange={(o) => (!o ? setOpen(false) : undefined)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Today's weight</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="w-kg">Weight (kg)</Label>
            <Input id="w-kg" inputMode="decimal" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="78.4" />
            <p className="text-xs text-muted-foreground">One entry per day; re-entering replaces today's value.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-32 items-center justify-center rounded-lg border border-dashed px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function addDaysStrLocal(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export { weekDates };
