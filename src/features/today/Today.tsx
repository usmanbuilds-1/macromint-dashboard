import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, ChevronDown, ChevronRight, Copy, Droplets, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/context/Session";
import { backend, bumpData } from "@/lib/backend";
import { useAsyncData, useDataVersion } from "@/hooks/useData";
import { dailyTotals, sumNutrients } from "@/lib/nutrition/math";
import { formatDateLong, todayStr, addDaysStr } from "@/lib/nutrition/datetime";
import { MEAL_LABELS, MEAL_TYPES, type DiaryEntry, type MealType } from "@/types";
import { useFoodLog } from "@/features/foods/FoodLogProvider";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";

function mealForCurrentHour(): MealType {
  const h = new Date().getHours();
  return h < 11 ? "breakfast" : h < 15 ? "lunch" : h < 21 ? "dinner" : "snacks";
}

export function Today() {
  const { goals } = useSession();
  const version = useDataVersion();
  const foodLog = useFoodLog();
  const today = todayStr();
  const [openLog, setOpenLog] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<MealType | null>(null);

  const diary = useAsyncData(() => backend.getDiary(today), [today, version]);
  const water = useAsyncData(() => backend.getWater(today), [today, version]);
  const entries = diary.data ?? [];
  const totals = useMemo(() => dailyTotals(entries), [entries]);
  const consumed = totals.kcal ?? 0;
  const target = goals?.calorieTarget ?? null;
  const remaining = target === null ? null : target - consumed;
  const protein = totals.protein ?? 0;
  const proteinTarget = goals?.proteinG ?? null;

  const byMeal = useMemo(() => {
    const map = new Map<MealType, DiaryEntry[]>(MEAL_TYPES.map((m): [MealType, DiaryEntry[]] => [m, []]));
    entries.forEach((entry) => map.get(entry.mealType)?.push(entry));
    return map;
  }, [entries]);

  const waterMl = (water.data ?? []).reduce((total, entry) => total + entry.amountMl, 0);
  const waterTarget = goals?.waterMl ?? null;

  const addWater = async (ml: number) => {
    try {
      await backend.addWater(today, ml);
      bumpData();
    } catch {
      toast.error("Water could not be saved. Try again.");
    }
  };

  const copyYesterday = async () => {
    try {
      const count = await backend.copyDay(addDaysStr(today, -1), today);
      bumpData();
      toast[count ? "success" : "info"](
        count ? `Copied ${count} items from yesterday` : "Nothing was logged yesterday",
      );
    } catch {
      toast.error("Could not copy your meals. Please try again.");
    }
  };

  const openSearch = (mealType = mealForCurrentHour()) => {
    setOpenLog(false);
    foodLog.open({ entryDate: today, mealType });
  };

  const openScan = () => {
    setOpenLog(false);
    foodLog.openScan({ entryDate: today, mealType: mealForCurrentHour() });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-7 pb-2">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{formatDateLong(today)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Today</h1>
        </div>
        <Link to="/diary" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          Diary <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </header>

      <section aria-labelledby="energy-heading" className="mm-today-summary">
        <div className="mm-today-summary-head">
          <div>
            <p className="text-xs font-medium text-muted-foreground">DAILY NUTRITION</p>
            <h2 id="energy-heading" className="text-base font-semibold tracking-tight">Your progress</h2>
          </div>
          {target === null && <Link className="text-xs font-medium text-primary underline underline-offset-4" to="/goals">Set a target</Link>}
        </div>
        <div className="mm-today-arc" role="progressbar" aria-label="Calories consumed today" aria-valuenow={consumed} aria-valuemin={0} aria-valuemax={Math.max(target ?? 0, consumed, 1)}>
          <svg viewBox="0 0 240 135" aria-hidden="true">
            <path d="M 19 119 A 101 101 0 0 1 221 119" pathLength="100" stroke="var(--color-secondary)" strokeWidth="14" strokeLinecap="round" fill="none" />
            <path d="M 19 119 A 101 101 0 0 1 221 119" pathLength="100" stroke="var(--color-primary)" strokeWidth="14" strokeLinecap="round" fill="none"
              strokeDasharray={`${target !== null && target > 0 ? Math.min(100, (consumed / target) * 100) : 0} 100`} />
          </svg>
          <div className="mm-today-arc-label">
            <strong className="tabular-nums">{diary.loading && !diary.data ? "—" : formatNumber(consumed)}</strong>
            <span className="tabular-nums">{target === null ? "kcal logged" : `of ${formatNumber(target)} kcal`}</span>
          </div>
        </div>
        {target !== null && (
          <p className="mm-today-remaining tabular-nums">
            {remaining !== null && remaining >= 0
              ? `${formatNumber(remaining)} kcal remaining`
              : `${formatNumber(Math.abs(remaining ?? 0))} kcal over target`}
          </p>
        )}
        <div className="mm-today-macros">
          {[
            { label: "Protein", value: protein, goal: proteinTarget },
            { label: "Carbs", value: totals.carbs ?? 0, goal: goals?.carbsG ?? null },
            { label: "Fat", value: totals.fat ?? 0, goal: goals?.fatG ?? null },
          ].map((macro) => (
            <div key={macro.label}>
              <span>{macro.label}</span>
              <strong className="tabular-nums">{formatNumber(macro.value)} g</strong>
              <small className="tabular-nums">{macro.goal === null ? "No target" : `of ${formatNumber(macro.goal)} g`}</small>
              <div role="progressbar" aria-label={`${macro.label} progress`} aria-valuemin={0} aria-valuenow={macro.value} aria-valuemax={Math.max(macro.goal ?? 0, macro.value, 1)} className="mm-today-macro-track">
                <i style={{ width: `${macro.goal && macro.goal > 0 ? Math.min(100, (macro.value / macro.goal) * 100) : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Log food" className="relative">
        <Button
          size="lg"
          className="h-12 w-full justify-center gap-2 text-sm font-semibold shadow-none"
          onClick={() => setOpenLog((current) => !current)}
          aria-expanded={openLog}
          aria-controls="log-actions"
        >
          <Plus className="h-5 w-5" aria-hidden="true" /> Log food
        </Button>
        {openLog && (
          <div id="log-actions" className="mt-2 overflow-hidden rounded-lg border bg-card">
            <button type="button" className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary" onClick={() => openSearch()}>
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Search or enter a food
            </button>
            <button type="button" className="flex min-h-12 w-full items-center gap-3 border-t px-4 text-left text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary" onClick={openScan}>
              <Camera className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Scan a meal photo
            </button>
          </div>
        )}
      </section>

      <section aria-labelledby="meals-heading">
        <div className="flex items-center justify-between gap-2">
          <h2 id="meals-heading" className="text-base font-semibold">Meals</h2>
          <Link to="/diary" className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4">View full diary</Link>
        </div>

        {diary.error && (
          <div className="my-3 flex items-center justify-between gap-3 rounded-md border border-destructive/40 p-3 text-sm">
            <span>Meals could not load.</span>
            <Button size="sm" variant="outline" onClick={diary.reload}>Retry</Button>
          </div>
        )}

        {diary.loading && !diary.data ? (
          <div className="flex flex-col gap-2 py-4">
            <Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" />
          </div>
        ) : (
          <div className="mt-1 border-y">
            {MEAL_TYPES.map((meal, idx) => {
              const mealEntries = byMeal.get(meal) ?? [];
              const mealKcal = sumNutrients(mealEntries.map((entry) => entry.nutrients)).kcal ?? 0;
              const expanded = expandedMeal === meal;
              return (
                <div key={meal} className={idx > 0 ? "border-t" : ""}>
                  <div className="flex min-h-[68px] items-center gap-2">
                    <button
                      type="button"
                      className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-2 text-left focus-visible:outline-2 focus-visible:outline-primary"
                      aria-expanded={expanded}
                      onClick={() => setExpandedMeal(expanded ? null : meal)}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{MEAL_LABELS[meal]}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {mealEntries.length ? `${mealEntries.length} logged item${mealEntries.length === 1 ? "" : "s"}` : "Nothing logged"}
                        </span>
                      </span>
                      <span className="ml-auto inline-flex shrink-0 items-center gap-2 text-sm tabular-nums">
                        {mealEntries.length ? `${formatNumber(mealKcal)} kcal` : ""}
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                      </span>
                    </button>
                    <button type="button" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-primary hover:bg-accent" aria-label={`Add food to ${MEAL_LABELS[meal]}`} onClick={() => openSearch(meal)}>
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  {expanded && (
                    <div className="space-y-2 pb-4">
                      {mealEntries.length === 0 ? (
                        <p className="px-1 text-sm text-muted-foreground">Add your first item to {MEAL_LABELS[meal].toLowerCase()}.</p>
                      ) : mealEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between gap-3 pl-1 pr-2 text-sm">
                          <span className="min-w-0 truncate">{entry.name} <span className="text-muted-foreground">· {formatNumber(entry.grams)} g</span></span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">{entry.nutrients.kcal === null || entry.nutrients.kcal === undefined ? "—" : `${formatNumber(entry.nutrients.kcal)} kcal`}</span>
                        </div>
                      ))}
                      <Link to="/diary" className="inline-block min-h-10 px-1 pt-2 text-sm font-medium text-primary underline underline-offset-4">Edit these entries</Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="Other quick actions" className="flex flex-col gap-3 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Droplets className="h-4 w-4" aria-hidden="true" />
            Water: {(waterMl / 1000).toFixed(1)} L{waterTarget !== null ? ` / ${(waterTarget / 1000).toFixed(1)} L` : ""}
          </p>
          <button type="button" className="min-h-11 px-2 text-sm font-medium text-foreground underline underline-offset-4" onClick={() => void addWater(250)}>Add 250 ml</button>
        </div>
        <button type="button" className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground" onClick={() => void copyYesterday()}>
          <Copy className="h-4 w-4" aria-hidden="true" /> Copy yesterday's meals
        </button>
      </section>
    </div>
  );
}
