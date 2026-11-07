import { useMemo, useState } from "react";
import { suggestedMealNow } from "@/lib/nutrition/meal-slot";
import { Camera, ChevronDown, ChevronLeft, ChevronRight, Copy, Pencil, Plus, Star, BookMarked, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/context/Session";
import { backend, bumpData } from "@/lib/backend";
import { useAsyncData } from "@/hooks/useData";
import { dailyTotals } from "@/lib/nutrition/math";
import { hasCompleteNutrientData } from "@/lib/nutrition/coverage";
import { addDaysStr, formatDateLong, formatDateShort, todayStr } from "@/lib/nutrition/datetime";
import { MEAL_LABELS, MEAL_TYPES, type DiaryEntry, type MealType } from "@/types";
import { useFoodLog } from "@/features/foods/FoodLogProvider";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ServingConfigDialog } from "@/features/foods/ServingConfig";
import { JourneyIntro } from "@/components/app/JourneyIntro";
import { JourneyEmpty } from "@/components/app/JourneyEmpty";
import { DiarySummary } from "./DiarySummary";
import { favoriteCandidateFromEntry, toggleFavoriteCandidate } from "@/features/foods/favorite-actions";

export function Diary() {
  const { goals } = useSession();
  const [date, setDate] = useState(todayStr());
  const [editEntry, setEditEntry] = useState<DiaryEntry | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const foodLog = useFoodLog();

  const diary = useAsyncData(() => backend.getDiary(date), [date], "diary:day");

  const entries = diary.data ?? [];
  const totals = useMemo(() => dailyTotals(entries), [entries]);

  const byMeal = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const m of MEAL_TYPES) map.set(m, []);
    for (const e of entries) map.get(e.mealType)?.push(e);
    return map;
  }, [entries]);

  const removeEntry = async (entry: DiaryEntry) => {
    try {
      await backend.deleteEntry(entry.id);
      bumpData();
    } catch {
      toast.error("Could not delete this entry. Try again.");
      return;
    }
    toast("Deleted " + entry.name, {
      action: {
        label: "Undo",
        onClick: async () => {
          await backend.addEntry({
            entryDate: entry.entryDate,
            mealType: entry.mealType,
            foodId: entry.foodId,
            recipeId: entry.recipeId,
            name: entry.name,
            brand: entry.brand,
            grams: entry.grams,
            portionPercent: entry.portionPercent,
            baseNutrients: entry.baseNutrients,
            source: entry.source,
          });
          bumpData();
        },
      },
    });
  };

  const duplicateEntry = async (entry: DiaryEntry) => {
    await backend.addEntry({
      entryDate: entry.entryDate,
      mealType: entry.mealType,
      foodId: entry.foodId,
      recipeId: entry.recipeId,
      name: entry.name,
      brand: entry.brand,
      grams: entry.grams,
      portionPercent: entry.portionPercent,
      baseNutrients: entry.baseNutrients,
      source: entry.source,
    });
    bumpData();
    toast.success("Duplicated");
  };

  const favoriteEntry = async (entry: DiaryEntry) => {
    try {
      const added = await toggleFavoriteCandidate(favoriteCandidateFromEntry(entry));
      bumpData();
      toast.success(added ? "Added to favorites" : "Removed from favorites");
    } catch {
      toast.error("Could not save this food to favorites. Try again.");
    }
  };

  const saveAsMeal = async (mealEntries: DiaryEntry[]) => {
    if (mealEntries.length === 0) return;
    const name = `${MEAL_LABELS[mealEntries[0]!.mealType]} ${formatDateShort(date)}`;
    await backend.saveMeal(name, mealEntries.map((e) => e.id));
    bumpData();
    toast.success(`Saved "${name}" — reuse it from any Add food search`);
  };

  const copyDay = async (from: string, to: string) => {
    try {
      const count = await backend.copyDay(from, to);
      bumpData();
      toast[count ? "success" : "info"](count ? `Copied ${count} items` : "Nothing to copy");
    } catch {
      toast.error("Meals could not be copied. Try again.");
    }
  };

  return (
    <div className="mm6-subpage mm6-page-diary flex flex-col gap-6">
      <JourneyIntro
        eyebrow="YOUR FOOD JOURNAL"
        title="Diary"
        description={`Food entries for ${formatDateLong(date)}.`}
        action={(
          <div className="mm-journey-date-switch" aria-label="Change diary day">
            <Button variant="ghost" size="icon" aria-label="Previous day"
              onClick={() => setDate((d) => addDaysStr(d, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Next day"
              disabled={date >= todayStr()}
              onClick={() => setDate((d) => addDaysStr(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      />
      {(!diary.error || diary.data) && (entries.length > 0 || diary.loading) && <DiarySummary totals={totals}
        calorieTarget={goals?.calorieTarget ?? null}
        proteinTarget={goals?.proteinG ?? null}
        hasEntries={entries.length > 0}
        complete={{
          kcal: entries.length === 0 || hasCompleteNutrientData(entries, "kcal"),
          protein: entries.length === 0 || hasCompleteNutrientData(entries, "protein"),
          carbs: entries.length === 0 || hasCompleteNutrientData(entries, "carbs"),
          fat: entries.length === 0 || hasCompleteNutrientData(entries, "fat"),
        }}
        loading={diary.loading && !diary.data}
      />}

      <div className="mm-journey-actions">
        <Button className="mm-journey-primary" onClick={() => foodLog.openSearch({ entryDate: date, mealType: suggestedMealNow() })}>
          <Plus className="h-4 w-4" /> Add food
        </Button>
        <Button variant="outline" className="mm-journey-secondary"
          onClick={() => foodLog.openScan({ entryDate: date, mealType: suggestedMealNow() })}>
          <Camera className="h-4 w-4" aria-hidden="true" /> Scan photo
        </Button>
        <details className="group relative">
          <summary className="flex min-h-11 cursor-pointer list-none items-center px-3 text-sm font-medium text-muted-foreground underline underline-offset-4">
            Copy meals
          </summary>
          <div className="absolute right-0 top-full z-10 mt-1 flex min-w-48 flex-col gap-1 rounded-md border bg-card p-2 shadow-sm">
            <button type="button" className="min-h-11 rounded-md px-3 text-left text-sm hover:bg-accent" onClick={() => void copyDay(addDaysStr(date, -1), date)}>Copy previous day's meals here</button>
            {date < todayStr() && <button type="button" className="min-h-11 rounded-md px-3 text-left text-sm hover:bg-accent" onClick={() => void copyDay(date, addDaysStr(date, 1))}>Copy this day forward</button>}
          </div>
        </details>
      </div>

      {diary.loading && !diary.data && <div className="space-y-2" aria-label="Loading diary">
        <div className="h-12 animate-pulse rounded-md bg-secondary" />
        <div className="h-12 animate-pulse rounded-md bg-secondary" />
      </div>}
      {diary.error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border border-destructive/30 p-3 text-sm">
          Could not load your diary for this day.
          <Button variant="outline" size="sm" onClick={diary.reload}>Retry</Button>
        </div>
      )}
      {!diary.loading && !diary.error && entries.length === 0 && (
        <JourneyEmpty
          title={date === todayStr() ? "No food recorded yet" : "No food recorded for this day"}
          description={date === todayStr()
            ? "Start with a meal or snack. You'll be able to edit portions and foods afterwards."
            : "You can add a meal for this date or copy foods from another day."}
        />
      )}

      {entries.length > 0 && MEAL_TYPES.filter((meal) => (byMeal.get(meal)?.length ?? 0) > 0).map((meal) => {
        const mealEntries = byMeal.get(meal) ?? [];
        return (
          <section key={meal} aria-label={MEAL_LABELS[meal]} className="mm-journey-meal-section overflow-hidden border-b">
            <div className="flex min-h-14 items-center justify-between gap-2 py-2.5">
              <div className="flex items-baseline gap-2.5">
                <h2 className="text-sm font-semibold">{MEAL_LABELS[meal]}</h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {mealEntries.length ? `${mealEntries.some((e) => e.nutrients.kcal == null) ? "≥ " : ""}${formatNumber((mealEntries.reduce((s, e) => s + (e.nutrients.kcal ?? 0), 0)))} kcal${mealEntries.some((e) => e.nutrients.kcal == null) ? " known" : ""}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {mealEntries.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => void saveAsMeal(mealEntries)}>
                    <BookMarked className="h-3.5 w-3.5" /> Save as meal
                  </Button>
                )}
                <Button variant="ghost" size="icon" aria-label={`Add to ${MEAL_LABELS[meal]}`} onClick={() => foodLog.open({ entryDate: date, mealType: meal })}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {mealEntries.length === 0 ? (
              <p className="mm-journey-meal-empty">Add food to this meal using the plus button.</p>
            ) : (
              <ul>
                {mealEntries.map((entry) => (
                  <li key={entry.id} className={cn("px-4 py-3", mealEntries.indexOf(entry) > 0 && "border-t")}>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className="min-h-11 min-w-0 flex-1 text-left"
                        onClick={() => setEditEntry(entry)}
                      >
                        <p className="truncate text-sm font-medium">{entry.name}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span>
                            {formatNumber(entry.grams, 0)} g
                            {entry.portionPercent !== 100 && (
                              <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">{entry.portionPercent}% eaten</Badge>
                            )}
                          </span>
                          <span className="tabular-nums">
                            P {entry.nutrients.protein == null ? "—" : formatNumber(entry.nutrients.protein, 1)} · C {entry.nutrients.carbs == null ? "—" : formatNumber(entry.nutrients.carbs, 1)} · F {entry.nutrients.fat == null ? "—" : formatNumber(entry.nutrients.fat, 1)}
                          </span>
                        </p>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-sm font-semibold tabular-nums">{entry.nutrients.kcal == null ? "—" : formatNumber(entry.nutrients.kcal)} <span className="text-xs font-normal text-muted-foreground">kcal</span></span>
                        <Button variant="ghost" size="icon" aria-label={`Edit ${entry.name}`} onClick={() => setEditEntry(entry)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`More actions for ${entry.name}`}
                          aria-expanded={openRow === entry.id}
                          onClick={() => setOpenRow((cur) => (cur === entry.id ? null : entry.id))}
                        >
                          <ChevronDown className={cn("h-4 w-4 transition-transform", openRow === entry.id && "rotate-180")} />
                        </Button>
                      </div>
                    </div>
                    {openRow === entry.id && (
                      <div className="mt-2.5 flex flex-wrap gap-2 rounded-lg border bg-secondary/40 p-2.5">
                        <button type="button" className="min-h-11 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent" onClick={() => { void duplicateEntry(entry); setOpenRow(null); }}>
                          <Copy className="mr-1.5 inline h-3 w-3" /> Duplicate
                        </button>
                        <button type="button" className="min-h-8 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent" onClick={() => { void favoriteEntry(entry); setOpenRow(null); }}>
                          <Star className="mr-1.5 inline h-3 w-3" /> Favourite
                        </button>
                        <button type="button" className="min-h-11 rounded-md border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10" onClick={() => { void removeEntry(entry); setOpenRow(null); }}>
                          <Trash2 className="mr-1.5 inline h-3 w-3" /> Delete
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {editEntry && (
        <ServingConfigDialog
          food={null}
          target={{ entryDate: date, mealType: editEntry.mealType, editEntryId: editEntry.id }}
          entry={editEntry}
          onClose={() => setEditEntry(null)}
        />
      )}
    </div>
  );
}
