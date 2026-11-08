import { useEffect, useState } from "react";
import { addDaysStr, todayStr } from "@/lib/nutrition/datetime";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { backend, bumpData } from "@/lib/backend";
import { useAsyncData } from "@/hooks/useData";
import { MEAL_LABELS, MEAL_TYPES, type MealType } from "@/types";

/** Planned food is NOT diary food. The backend confirms consumption atomically. */
export function DiaryPlanner({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const [planDate,setPlanDate] = useState(date);
  useEffect(()=>setPlanDate(date),[date]);
  const [savedId, setSavedId] = useState("");
  const [meal, setMeal] = useState<MealType>("lunch");
  const [busy, setBusy] = useState(false);
  const saved = useAsyncData(() => backend.getSavedMeals(), [], "saved-meals", open);
  const plans = useAsyncData(() => backend.getPlannedMeals(planDate, planDate), [planDate], "planned:"+planDate, open);
  const selected = savedId || saved.data?.[0]?.id || "";
  const action = async (task: () => Promise<void>, success: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await task(); bumpData(); await plans.reload(); toast.success(success);
    } catch {
      toast.error("Could not update this plan. Check your diary before retrying.");
    } finally { setBusy(false); }
  };
  return (
    <details className="mm-diary-planner border-t pt-3" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
        Plan ahead <span className="ml-auto text-xs font-normal text-muted-foreground">Does not count as eaten</span>
      </summary>
      {open && (
        <div className="grid gap-3 pb-4">
          <p className="text-xs leading-5 text-muted-foreground">
            Schedule a saved meal for {date}. Add it to your diary only when you've eaten it.
          </p>
          <label className="grid gap-1 text-xs font-semibold">
            Planning date
            <input type="date" value={planDate}
              min={addDaysStr(todayStr(),-31)} max={addDaysStr(todayStr(),365)}
              onChange={(e)=>setPlanDate(e.target.value)}
              className="min-h-11 w-full rounded border bg-transparent px-3" />
          </label>
          {saved.loading && <p role="status" className="text-sm">Loading saved meals…</p>}
          {saved.error && <p role="alert" className="text-sm">Saved meals unavailable. <button type="button" onClick={saved.reload}>Retry</button></p>}
          {!saved.loading && saved.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing saved yet. <Link to="/foods" className="font-semibold underline underline-offset-4">Save a meal in Foods</Link> to plan it later.
            </p>
          )}
          {!!saved.data?.length && (
            <form className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                if (!selected) return;
                void action(async () => { await backend.planSavedMeal(selected,planDate,meal); },
                  "Meal planned; nothing was added to your diary");
              }}>
              <label className="grid gap-1 text-xs font-semibold">Saved meal
                <select aria-label="Saved meal to plan" value={selected}
                  onChange={(e) => setSavedId(e.target.value)}
                  className="min-h-11 w-full rounded border bg-transparent px-2">
                  {saved.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold">Meal
                <select aria-label="Planned meal type" value={meal}
                  onChange={(e) => setMeal(e.target.value as MealType)}
                  className="min-h-11 w-full rounded border bg-transparent px-2">
                  {MEAL_TYPES.map((type) => <option key={type} value={type}>{MEAL_LABELS[type]}</option>)}
                </select>
              </label>
              <button type="submit" disabled={busy} className="min-h-11 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground">
                {busy ? "Saving…" : "Add to plan"}
              </button>
            </form>
          )}
          {plans.loading && <p role="status" className="text-sm">Loading planned meals…</p>}
          {plans.error && <p role="alert" className="text-sm">
            Planning isn't available yet. The database update may be required.
            <button type="button" className="ml-2 underline" onClick={plans.reload}>Retry</button>
          </p>}
          {!!plans.data?.length && (
            <ul className="divide-y border-y" aria-label="Meals planned for this day">
              {plans.data.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {MEAL_LABELS[item.mealType]} · {item.items.length} foods · {item.state === "eaten" ? "Logged" : "Planned only"}
                    </p>
                  </div>
                  {item.state === "planned" && (
                    <>
                      <button type="button" disabled={busy || planDate > todayStr()} title={planDate > todayStr() ? "You can log it on its scheduled date" : undefined} className="min-h-11 rounded bg-primary px-3 text-xs font-semibold text-primary-foreground"
                        onClick={() => { void action(async () => { await backend.markPlannedMealEaten(item.id); },
                          "Meal added to Diary"); }}>{planDate > todayStr() ? "Not eaten yet" : "Mark eaten"}</button>
                      <button type="button" disabled={busy} className="min-h-11 px-2 text-xs font-semibold underline underline-offset-4"
                        onClick={() => { void action(() => backend.removePlannedMeal(item.id),"Plan removed"); }}>Remove</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </details>
  );
}
