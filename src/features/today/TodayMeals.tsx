import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { sumNutrients } from "@/lib/nutrition/math";
import { formatNumber } from "@/lib/utils";
import { MEAL_LABELS, MEAL_TYPES, type DiaryEntry, type MealType } from "@/types";

/** Only shows what was actually logged; avoids four empty accordion panels
 * on first use and makes the next suggested meal actionable.
 */
export function TodayMeals({
  entries, loading, error, onRetry, onAddMeal, suggestedMeal,
}: {
  entries: DiaryEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAddMeal: (meal: MealType) => void;
  suggestedMeal: MealType;
}) {
  const [expandedMeal, setExpandedMeal] = useState<MealType | null>(null);
  const byMeal = useMemo(() => {
    const map = new Map<MealType, DiaryEntry[]>(
      MEAL_TYPES.map((meal): [MealType, DiaryEntry[]] => [meal, []]),
    );
    entries.forEach((entry) => map.get(entry.mealType)?.push(entry));
    return map;
  }, [entries]);

  return (
    <section aria-labelledby="meals-heading" className="mm-home-meals">
      <div className="mm-home-section-head">
        <div>
          <p className="mm-home-overline">THE FOOD JOURNAL</p>
          <h2 id="meals-heading">Your meals</h2>
        </div>
        <Link to="/diary" className="mm-home-text-link">Open diary</Link>
      </div>

      {error && (
        <div role="alert" className="mm-home-error">
          <span>Meals couldn't load.</span>
          <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
        </div>
      )}

      {loading && entries.length === 0 && !error ? (
        <div className="mm-home-meals-loading" role="status" aria-label="Loading meals">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error ? null : entries.length === 0 ? (
        <div className="mm-home-first-meal">
          <h3>Nothing logged yet</h3>
          <p>Your meals will appear here as you add them.</p>
        </div>
      ) : (
        <div className="mm-home-meal-list">
          {MEAL_TYPES.filter((meal) => (byMeal.get(meal)?.length ?? 0) > 0).map((meal) => {
            const mealEntries = byMeal.get(meal) ?? [];
            const mealKcal = sumNutrients(mealEntries.map((entry) => entry.nutrients)).kcal;
            const expanded = expandedMeal === meal;
            return (
              <div key={meal} className="mm-home-meal">
                <div className="mm-home-meal-main">
                  <button type="button" className="mm-home-meal-toggle"
                    aria-expanded={expanded}
                    aria-controls={`today-meal-${meal}`}
                    onClick={() => setExpandedMeal(expanded ? null : meal)}>
                    <span className="mm-home-meal-title">
                      <strong>{MEAL_LABELS[meal]}</strong>
                      <small>{mealEntries.length
                        ? `${mealEntries.length} ${mealEntries.length === 1 ? "item" : "items"}`
                        : "Not logged yet"}</small>
                    </span>
                    <span className="mm-home-meal-end tabular-nums">
                      {mealEntries.length > 0 &&
                        <span>{mealKcal == null ? "—" : formatNumber(mealKcal)} <small>kcal</small></span>}
                      <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                        aria-hidden="true" />
                    </span>
                  </button>
                  <button type="button" className="mm-home-meal-add"
                    aria-label={`Add food to ${MEAL_LABELS[meal]}`}
                    onClick={() => onAddMeal(meal)}>
                    <Plus className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                {expanded && (
                  <div id={`today-meal-${meal}`} className="mm-home-meal-details">
                    {mealEntries.length === 0 ? (
                      <p>Nothing here yet. Use the plus button to log {MEAL_LABELS[meal].toLowerCase()}.</p>
                    ) : (
                      <>
                        {mealEntries.map((entry) => (
                          <div key={entry.id} className="mm-home-entry">
                            <span className="mm-home-entry-name">{entry.name}
                              <small> · {formatNumber(entry.grams)} g</small>
                            </span>
                            <span className="tabular-nums">
                              {entry.nutrients.kcal == null ? "—" : formatNumber(entry.nutrients.kcal)} kcal
                            </span>
                          </div>
                        ))}
                        <Link to="/diary" className="mm-home-text-link">Edit your diary</Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
