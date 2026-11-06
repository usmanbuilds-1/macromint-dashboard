import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JourneyEmpty } from "@/components/app/JourneyEmpty";
import { backend, bumpData } from "@/lib/backend";
import { useAsyncData } from "@/hooks/useData";
import { todayStr } from "@/lib/nutrition/datetime";
import { MEAL_LABELS, MEAL_TYPES, type MealType } from "@/types";

export function SavedMealsTab({ active }: { active: boolean }) {
  const savedMeals = useAsyncData(() => backend.getSavedMeals(), [], "saved-meals", active);
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const replay = async (id: string) => {
    if (busy) return;
    setBusy(id);
    try {
      await backend.logSavedMeal(id, todayStr(), mealType);
      bumpData();
      toast.success("Meal added to today's " + MEAL_LABELS[mealType].toLowerCase());
    } catch {
      toast.error("Could not reuse this meal. Please retry.");
    } finally {
      setBusy(null);
    }
  };

  const rename = async (id: string) => {
    const name = draft.trim();
    if (!name || name.length > 100 || busy) {
      toast.error("Meal name must be 1–100 characters");
      return;
    }
    setBusy(id);
    try {
      await backend.renameSavedMeal(id, name);
      bumpData();
      setRenaming(null);
      toast.success("Meal renamed");
    } catch {
      toast.error("Could not rename meal");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    if (busy) return;
    setBusy(id);
    try {
      await backend.deleteSavedMeal(id);
      bumpData();
      setConfirmDelete(null);
      toast.success("Saved meal removed. Existing diary entries were not changed.");
    } catch {
      toast.error("Could not remove saved meal");
    } finally {
      setBusy(null);
    }
  };

  if (savedMeals.error) {
    return (
      <div role="alert" className="flex items-center justify-between gap-3 border-y py-4 text-sm">
        Saved meals couldn't load.
        <Button type="button" variant="outline" size="sm" onClick={savedMeals.reload}>Retry</Button>
      </div>
    );
  }

  if (savedMeals.loading && !savedMeals.data) return <p className="py-6 text-sm text-muted-foreground">Loading saved meals…</p>;
  if (!savedMeals.data?.length) {
    return <JourneyEmpty title="Nothing saved yet" description="In Diary, use Save as meal on a logged meal to make a reusable template." />;
  }

  return (
    <section aria-label="Saved meals" className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-b pb-3">
        <p className="text-sm text-muted-foreground">Repeat a saved meal without searching for every ingredient.</p>
        <select aria-label="Meal to log into" value={mealType}
          onChange={(event) => setMealType(event.target.value as MealType)}
          className="h-11 shrink-0 rounded-md border bg-background px-3 text-sm">
          {MEAL_TYPES.map((meal) => <option key={meal} value={meal}>{MEAL_LABELS[meal]}</option>)}
        </select>
      </div>
      {savedMeals.data.map((meal) => (
        <div key={meal.id} className="flex flex-col gap-3 border-b py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            {renaming === meal.id ? (
              <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); void rename(meal.id); }}>
                <Input aria-label="New saved meal name" autoFocus maxLength={100} value={draft}
                  onChange={(event) => setDraft(event.target.value)} />
                <Button type="submit" size="sm" disabled={busy === meal.id}>Save</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setRenaming(null)}>Cancel</Button>
              </form>
            ) : (
              <>
                <h3 className="text-sm font-semibold">{meal.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{meal.items.length} {meal.items.length === 1 ? "food" : "foods"} · Saved template</p>
              </>
            )}
          </div>
          {renaming !== meal.id && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" variant="outline" disabled={busy === meal.id} onClick={() => { void replay(meal.id); }}>Log</Button>
              <Button size="sm" variant="ghost" disabled={Boolean(busy)}
                onClick={() => { setRenaming(meal.id); setDraft(meal.name); setConfirmDelete(null); }}>Rename</Button>
              {confirmDelete === meal.id ? (
                <>
                  <Button size="sm" variant="destructive" disabled={Boolean(busy)} onClick={() => { void remove(meal.id); }}>
                    Confirm delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" className="text-destructive" disabled={Boolean(busy)}
                  onClick={() => setConfirmDelete(meal.id)}>Delete</Button>
              )}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
