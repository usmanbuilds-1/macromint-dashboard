import { Camera, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/context/Session";
import { visibleDailyGoals } from "@/lib/nutrition/visible-goals";
import { backend, bumpData } from "@/lib/backend";
import { useAsyncData } from "@/hooks/useData";
import { dailyTotals } from "@/lib/nutrition/math";
import { hasCompleteNutrientData } from "@/lib/nutrition/coverage";
import { formatDateLong, todayStr } from "@/lib/nutrition/datetime";
import type { MealType } from "@/types";
import { suggestedMealNow } from "@/lib/nutrition/meal-slot";
import { useFoodLog } from "@/features/foods/FoodLogProvider";
import { TodayOverview } from "./TodayOverview";
import { TodayMeals } from "./TodayMeals";
import { TodayUtilities } from "./TodayUtilities";
import { TodayNextStep } from "./TodayNextStep";
import { recentEntryToLoggable } from "@/features/foods/recent-food";
import { rankRecentForMeal } from "./rank-recent";
import { toast } from "sonner";
import "./today.css";

/** The daily workflow: one overview, an immediate action, then the journal.
 * All nutrition arithmetic and data fetching remain in their existing modules.
 */
export function Today() {
  const { goals } = useSession();
  const activeGoals = visibleDailyGoals(goals);
  const foodLog = useFoodLog();
  const date = todayStr();

  const diary = useAsyncData(() => backend.getDiary(date), [date], "diary:day");
  const recent = useAsyncData(() => backend.getRecentEntries(8), [], "recent:8");
  const entries = diary.data ?? [];
  const totals = dailyTotals(entries);
  const suggestedMeal = suggestedMealNow();
  const lastOtherDay = rankRecentForMeal(recent.data ?? [], date, suggestedMeal);

  const openFood = (mealType: MealType = suggestedMeal) => {
    foodLog.openSearch({ entryDate: date, mealType });
  };
  const openScan = () => {
    foodLog.openScan({ entryDate: date, mealType: suggestedMeal });
  };
  const addWater = async () => {
    try {
      await backend.addWater(date, 250);
      bumpData();
    } catch {
      toast.error("Water could not be saved. Try again.");
    }
  };
  const intro = entries.length > 0
    ? `${entries.length} ${entries.length === 1 ? "food" : "foods"} logged today`
    : null;

  return (
    <div className="mm-home mm-live-page ref-live-today">
      <header className="mm-home-header">
        <div className="mm-home-heading">
          <time dateTime={date}>{formatDateLong(date)}</time>
          <h1 className="mm-home-title">Today</h1>
          {intro && <p>{intro}</p>}
        </div>
      </header>

      <TodayOverview
        totals={totals}
        target={activeGoals?.calorieTarget ?? null}
        proteinTarget={activeGoals?.proteinG ?? null}
        carbsTarget={activeGoals?.carbsG ?? null}
        fatTarget={activeGoals?.fatG ?? null}
        loading={diary.loading && !diary.data}
        hasEntries={entries.length > 0}
        complete={{
          kcal: entries.length === 0 || hasCompleteNutrientData(entries, "kcal"),
          protein: entries.length === 0 || hasCompleteNutrientData(entries, "protein"),
          carbs: entries.length === 0 || hasCompleteNutrientData(entries, "carbs"),
          fat: entries.length === 0 || hasCompleteNutrientData(entries, "fat"),
        }}
      />

      <section aria-label="Add food" className="mm-home-actions">
        <Button type="button" onClick={() => openFood()}
          className="mm-home-action-primary">
          <Plus className="h-5 w-5" aria-hidden="true" />
          Add food
          <span className="mm-home-action-mark" aria-hidden="true">↗</span>
        </Button>
        <Button type="button" variant="outline" onClick={openScan}
          className="mm-home-action-secondary">
          <Camera className="h-5 w-5" aria-hidden="true" />
          Scan photo
        </Button>
      </section>

      {(entries.length > 0 || diary.loading || Boolean(diary.error)) && <TodayMeals entries={entries}
        loading={diary.loading && !diary.data}
        error={diary.error}
        onRetry={diary.reload}
        onAddMeal={openFood}
        suggestedMeal={suggestedMeal}
      />}
      {!diary.loading && !diary.error && entries.length === 0 && (
        <TodayNextStep previous={lastOtherDay}
          onRepeat={(entry) => foodLog.open({ entryDate: date, mealType: suggestedMeal, initialFood: recentEntryToLoggable(entry) })} />
      )}

      <TodayUtilities
        date={date}
        waterTarget={activeGoals?.waterMl ?? null}
        onAddWater={() => { void addWater(); }}
      />
    </div>
  );
}
