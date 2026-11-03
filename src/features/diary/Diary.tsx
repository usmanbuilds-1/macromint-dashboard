import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Pencil, Plus, Star, BookMarked, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalorieRing, MacroBar } from "@/components/app/bits";
import { useSession } from "@/context/Session";
import { backend, bumpData } from "@/lib/backend";
import { useAsyncData, useDataVersion } from "@/hooks/useData";
import { dailyTotals } from "@/lib/nutrition/math";
import { addDaysStr, formatDateLong, formatDateShort, todayStr } from "@/lib/nutrition/datetime";
import { MEAL_LABELS, MEAL_TYPES, type DiaryEntry } from "@/types";
import { useFoodLog } from "@/features/foods/FoodLogProvider";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ServingConfigDialog } from "@/features/foods/ServingConfig";

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
  const target = goals?.calorieTarget ?? 2000;

  const byMeal = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const m of MEAL_TYPES) map.set(m, []);
    for (const e of entries) map.get(e.mealType)?.push(e);
    return map;
  }, [entries]);

  const removeEntry = async (entry: DiaryEntry) => {
    await backend.deleteEntry(entry.id);
    bumpData();
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
    const count = await backend.copyDay(from, to);
    bumpData();
    toast[count ? "success" : "info"](count ? `Copied ${count} items` : "Nothing to copy");
  };

  return (
    <div className="flex flex-col gap-6">
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

      <section aria-label="Day summary" className="rounded-xl border bg-card">
        <div className="flex flex-col items-center gap-5 p-5 sm:flex-row">
          <CalorieRing consumed={kcal} target={target} size={128} />
          <div className="w-full flex-1">
            <div className="flex flex-col gap-3">
              <MacroBar label="Protein" value={totals.protein ?? 0} target={goals?.proteinG ?? 100} colorClass="bg-macro-protein" />
              <MacroBar label="Carbohydrates" value={totals.carbs ?? 0} target={goals?.carbsG ?? 200} colorClass="bg-macro-carbs" />
              <MacroBar label="Fat" value={totals.fat ?? 0} target={goals?.fatG ?? 65} colorClass="bg-macro-fat" />
              {(totals.fiber != null || goals?.fiberG) && (
                <MacroBar label="Fiber" value={totals.fiber ?? 0} target={goals?.fiberG ?? 30} colorClass="bg-chart-5" />
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => foodLog.open({ entryDate: date, mealType: "breakfast" })} className="gap-2">
          <Plus className="h-4 w-4" /> Add food
        </Button>
        <Button variant="outline" onClick={() => copyDay(addDaysStr(date, -1), date)}>
          <Copy className="h-4 w-4" /> Copy yesterday
        </Button>
        <Button variant="outline" onClick={() => copyDay(date, addDaysStr(date, 1))} disabled={date >= todayStr()}>
          <Copy className="h-4 w-4" /> Copy to tomorrow
        </Button>
      </div>

      {MEAL_TYPES.map((meal) => {
        const mealEntries = byMeal.get(meal) ?? [];
        return (
          <section key={meal} aria-label={MEAL_LABELS[meal]} className="overflow-hidden rounded-xl border">
            <div className="flex items-center justify-between border-b bg-secondary/40 px-4 py-2.5">
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
                        className="min-w-0 flex-1 text-left"
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
                        <button type="button" className="min-h-8 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent" onClick={() => { void duplicateEntry(entry); setOpenRow(null); }}>
                          <Copy className="mr-1.5 inline h-3 w-3" /> Duplicate
                        </button>
                        <button type="button" className="min-h-8 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent" onClick={() => { void favoriteEntry(entry); setOpenRow(null); }}>
                          <Star className="mr-1.5 inline h-3 w-3" /> Favourite
                        </button>
                        <button type="button" className="min-h-8 rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10" onClick={() => { void removeEntry(entry); setOpenRow(null); }}>
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
