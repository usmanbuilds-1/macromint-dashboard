import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Pencil, Plus, Star, BookMarked, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/context/Session";
import { backend, bumpData } from "@/lib/backend";
import { useAsyncData, useDataVersion } from "@/hooks/useData";
import { dailyTotals } from "@/lib/nutrition/math";
import { addDaysStr, formatDateLong, formatDateShort, todayStr } from "@/lib/nutrition/datetime";
import { MEAL_LABELS, MEAL_TYPES, type DiaryEntry, type MealType } from "@/types";
import { useFoodLog } from "@/features/foods/FoodLogProvider";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ServingConfigDialog } from "@/features/foods/ServingConfig";

function preferredMeal(): MealType {
  const hour = new Date().getHours();
  return hour < 11 ? "breakfast" : hour < 15 ? "lunch" : hour < 21 ? "dinner" : "snacks";
}

export function Diary() {
  const { goals } = useSession();
  const version = useDataVersion();
  const [date, setDate] = useState(todayStr());
  const [editEntry, setEditEntry] = useState<DiaryEntry | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const foodLog = useFoodLog();

  const diary = useAsyncData(() => backend.getDiary(date), [date, version]);

  const entries = diary.data ?? [];
  const totals = useMemo(() => dailyTotals(entries), [entries]);
  const kcal = totals.kcal ?? 0;
  const target = goals?.calorieTarget ?? null;
  const remaining = target === null ? null : target - kcal;

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
    if (!entry.foodId) {
      toast.info("Only database foods can be favourited");
      return;
    }
    const added = await backend.toggleFavorite(entry.foodId);
    bumpData();
    toast.success(added ? "Added to favourites" : "Removed from favourites");
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
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Diary</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{formatDateLong(date)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Previous day" onClick={() => setDate((d) => addDaysStr(d, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Next day" disabled={date >= todayStr()} onClick={() => setDate((d) => addDaysStr(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <section aria-label="Diary totals" className="border-y py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{remaining === null ? "Energy eaten" : remaining < 0 ? "Above energy target" : "Energy remaining"}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {formatNumber(remaining === null ? kcal : Math.abs(remaining))}
              <span className="ml-2 text-sm font-normal text-muted-foreground">kcal</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">{formatNumber(kcal)} logged{target !== null ? ` of ${formatNumber(target)} kcal` : ""}</p>
          </div>
          <div className="min-w-[125px]">
            <p className="text-xs font-medium text-muted-foreground">Protein</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatNumber(totals.protein ?? 0)} g
              {goals?.proteinG != null && <span className="text-sm font-normal text-muted-foreground"> / {goals.proteinG} g</span>}
            </p>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              Carbs {formatNumber(totals.carbs ?? 0)} g · Fat {formatNumber(totals.fat ?? 0)} g
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button className="min-h-11 flex-1 gap-2 sm:flex-none" onClick={() => foodLog.open({ entryDate: date, mealType: preferredMeal() })}>
          <Plus className="h-4 w-4" /> Log food
        </Button>
        <details className="group relative">
          <summary className="flex min-h-11 cursor-pointer list-none items-center px-3 text-sm font-medium text-muted-foreground underline underline-offset-4">
            Reuse a day
          </summary>
          <div className="absolute right-0 top-full z-10 mt-1 flex min-w-48 flex-col gap-1 rounded-md border bg-card p-2 shadow-sm">
            <button type="button" className="min-h-11 rounded-md px-3 text-left text-sm hover:bg-accent" onClick={() => void copyDay(addDaysStr(date, -1), date)}>Copy yesterday here</button>
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
        <p className="text-sm text-muted-foreground">Nothing logged on this day yet. Add food to start your diary.</p>
      )}

      {MEAL_TYPES.map((meal) => {
        const mealEntries = byMeal.get(meal) ?? [];
        return (
          <section key={meal} aria-label={MEAL_LABELS[meal]} className="overflow-hidden border-b">
            <div className="flex min-h-14 items-center justify-between gap-2 py-2.5">
              <div className="flex items-baseline gap-2.5">
                <h2 className="text-sm font-semibold">{MEAL_LABELS[meal]}</h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {mealEntries.length ? `${formatNumber((mealEntries.reduce((s, e) => s + (e.nutrients.kcal ?? 0), 0)))} kcal` : ""}
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
              <p className="px-4 py-4 text-sm text-muted-foreground">Nothing logged.</p>
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
                            P {formatNumber(entry.nutrients.protein ?? 0, 1)} · C {formatNumber(entry.nutrients.carbs ?? 0, 1)} · F {formatNumber(entry.nutrients.fat ?? 0, 1)}
                          </span>
                        </p>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-sm font-semibold tabular-nums">{formatNumber(entry.nutrients.kcal ?? 0)} <span className="text-xs font-normal text-muted-foreground">kcal</span></span>
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
