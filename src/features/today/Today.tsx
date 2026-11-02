import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Camera, ChevronRight, Copy, Droplets, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalorieRing, MacroBar } from "@/components/app/bits";
import { useSession } from "@/context/Session";
import { backend, bumpData } from "@/lib/backend";
import { useDataVersion } from "@/hooks/useData";
import { dailyTotals, sumNutrients } from "@/lib/nutrition/math";
import { formatDateLong, todayStr, addDaysStr } from "@/lib/nutrition/datetime";
import { MEAL_LABELS, MEAL_TYPES, type DiaryEntry } from "@/types";
import { useFoodLog } from "@/features/foods/FoodLogProvider";
import { useAsyncData } from "@/hooks/useData";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";

export function Today() {
  const { profile, goals } = useSession();
  const version = useDataVersion();
  const foodLog = useFoodLog();
  const today = todayStr();

  const diary = useAsyncData(() => backend.getDiary(today), [today, version]);
  const water = useAsyncData(() => backend.getWater(today), [today, version]);

  const entries = diary.data ?? [];
  const totals = useMemo(() => dailyTotals(entries), [entries]);
  const kcal = totals.kcal ?? 0;
  const target = goals?.calorieTarget ?? 2000;

  const byMeal = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const m of MEAL_TYPES) map.set(m, []);
    for (const e of entries) map.get(e.mealType)?.push(e);
    return map;
  }, [entries]);

  const waterMl = (water.data ?? []).reduce((s, w) => s + w.amountMl, 0);
  const waterTarget = goals?.waterMl ?? 2500;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (profile?.name || "there").split(" ")[0];

  const addWater = async (ml: number) => {
    await backend.addWater(today, ml);
    bumpData();
  };

  const copyYesterday = async () => {
    const yesterday = addDaysStr(today, -1);
    const count = await backend.copyDay(yesterday, today);
    bumpData();
    toast[count ? "success" : "info"](count ? `Copied ${count} items from yesterday` : "Nothing was logged yesterday");
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm text-muted-foreground">{formatDateLong(today)}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
          {greeting}, {firstName}.
        </h1>
      </header>

      {/* Calorie hero */}
      <section aria-label="Calorie progress" className="rounded-xl border bg-card">
        <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center sm:gap-8">
          <CalorieRing consumed={kcal} target={target} />
          <div className="w-full min-w-0 flex-1">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium">Energy</p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {formatNumber(kcal)} / {formatNumber(target)} kcal
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-3.5">
              <MacroBar label="Protein" value={totals.protein ?? 0} target={goals?.proteinG ?? 100} colorClass="bg-macro-protein" />
              <MacroBar label="Carbohydrates" value={totals.carbs ?? 0} target={goals?.carbsG ?? 200} colorClass="bg-macro-carbs" />
              <MacroBar label="Fat" value={totals.fat ?? 0} target={goals?.fatG ?? 65} colorClass="bg-macro-fat" />
            </div>
            {entries.length === 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Nothing logged yet today. Scan a meal or add your first item below.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Button size="lg" variant="outline" className="flex-col gap-1.5 py-4" onClick={() => foodLog.openScan({ entryDate: today, mealType: currentMealType() })}>
          <Camera className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Scan meal</span>
        </Button>
        <Button size="lg" variant="outline" className="flex-col gap-1.5 py-4" onClick={() => foodLog.open({ entryDate: today, mealType: currentMealType() })}>
          <Plus className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Add food</span>
        </Button>
        <Button size="lg" variant="outline" className="flex-col gap-1.5 py-4" onClick={copyYesterday}>
          <Copy className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Copy yesterday</span>
        </Button>
        <Button size="lg" variant="outline" className="flex-col gap-1.5 py-4" asChild>
          <Link to="/diary">
            <ChevronRight className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Full diary</span>
          </Link>
        </Button>
      </section>

      {/* Water */}
      <section aria-label="Water intake" className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Droplets className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Water</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {(waterMl / 1000).toFixed(1)} L of {(waterTarget / 1000).toFixed(1)} L
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void addWater(250)}>+250 ml</Button>
            <Button variant="outline" size="sm" onClick={() => void addWater(500)}>+500 ml</Button>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min((waterMl / waterTarget) * 100, 100)}%` }} />
        </div>
      </section>

      {/* Meals */}
      <section aria-label="Meals">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Meals</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/diary">Edit diary</Link>
          </Button>
        </div>
        <div className="mt-2 overflow-hidden rounded-xl border">
          {MEAL_TYPES.map((meal, idx) => {
            const mealEntries = byMeal.get(meal) ?? [];
            const mealKcal = sumNutrients(mealEntries.map((e) => e.nutrients)).kcal ?? 0;
            return (
              <div
                key={meal}
                className={`flex items-center justify-between gap-3 px-4 py-3.5 ${idx > 0 ? "border-t" : ""} hover:bg-accent/40`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{MEAL_LABELS[meal]}</p>
                  <p className="text-xs text-muted-foreground">
                    {mealEntries.length === 0
                      ? mealSuggestion(meal)
                      : `${mealEntries.length} item${mealEntries.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {mealKcal > 0 ? `${formatNumber(mealKcal)} kcal` : ""}
                  </span>
                  <Button variant="ghost" size="icon" aria-label={`Add to ${MEAL_LABELS[meal]}`} onClick={() => foodLog.open({ entryDate: today, mealType: meal })}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {diary.loading && entries.length === 0 && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}
    </div>
  );
}

function currentMealType(): never {
  const h = new Date().getHours();
  if (h < 11) return "breakfast" as never;
  if (h < 15) return "lunch" as never;
  if (h < 21) return "dinner" as never;
  return "snacks" as never;
}

function mealSuggestion(meal: string): string {
  const h = new Date().getHours();
  const missed = (m: string) => m === meal;
  if (missed("breakfast") && h < 11) return "Time for breakfast?";
  if (missed("lunch") && h >= 11 && h < 15) return "Time for lunch?";
  if (missed("dinner") && h >= 15 && h < 21) return "Time for dinner?";
  if (missed("snacks")) return "Add a snack";
  return "No items logged";
}
