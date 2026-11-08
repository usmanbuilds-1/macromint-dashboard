import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { DayGoalTargets, GoalSet, WeeklyGoalTargets } from "@/types";
import { backend, bumpData } from "@/lib/backend";
import { DAY_NAMES, validDayTarget } from "@/lib/nutrition/day-targets";
import { Button } from "@/components/ui/button";

/** Seven optional overrides, saved with the existing RLS-governed goal row. */
export function WeeklyGoalSchedule({ goals, onSaved }: {
  goals: GoalSet | null; onSaved: () => Promise<void>;
}) {
  const [day, setDay] = useState(1);
  const [draft, setDraft] = useState<DayGoalTargets>({
    calorieTarget: 2000, proteinG: 100, carbsG: 220, fatG: 67,
  });
  const [busy, setBusy] = useState(false);
  const key = String(day) as keyof WeeklyGoalTargets;
  useEffect(() => {
    if (goals) {
      const current = goals.dayTargets?.[key] ?? goals;
      setDraft({
        calorieTarget: current.calorieTarget, proteinG: current.proteinG,
        carbsG: current.carbsG, fatG: current.fatG,
      });
    }
  }, [goals, key]);
  const save = async (reset = false) => {
    if (!goals || (!reset && !validDayTarget(draft)) || busy) return;
    const schedule = { ...goals.dayTargets };
    if (reset) delete schedule[key];
    else schedule[key] = draft;
    setBusy(true);
    try {
      await backend.saveGoals({ dayTargets: schedule });
      bumpData();
      await onSaved();
      toast.success(reset ? "Day uses your usual targets" : "Day-specific target saved");
    } catch {
      toast.error("Couldn't update weekly targets. Existing goals were not changed.");
    } finally { setBusy(false); }
  };
  if (!goals || goals.method === "placeholder") return null;
  return (
    <details className="mm-weekly-goals border-t pt-4">
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">Different targets on different days</summary>
      <p className="mb-3 text-sm text-muted-foreground">
        Optional. Set a different calorie or macro target for a weekday. This never changes recorded food.
      </p>
      <label className="mb-4 block text-sm font-semibold">Day of week
        <select className="mt-1 block min-h-11 w-full rounded border bg-transparent px-3"
          value={day} onChange={(e) => setDay(Number(e.target.value))}>
          {DAY_NAMES.map((name,index) => <option key={name} value={index}>{name}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        {([
          ["calorieTarget","Calories","kcal"],["proteinG","Protein","g"],
          ["carbsG","Carbs","g"],["fatG","Fat","g"],
        ] as const).map(([field,label,unit]) => (
          <label key={field} className="block text-sm font-semibold">{label} ({unit})
            <input type="number" inputMode="numeric" step={1}
              value={draft[field]} onChange={(e) => setDraft((prev)=>({...prev,[field]:Number(e.target.value)}))}
              className="mt-1 min-h-11 w-full rounded border bg-transparent px-3" />
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button disabled={busy || !validDayTarget(draft)} onClick={()=>{void save();}}>
          {busy ? "Saving…" : "Save this day"}
        </Button>
        {goals.dayTargets?.[key] && (
          <Button variant="outline" disabled={busy} onClick={()=>{void save(true);}}>Use usual targets</Button>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {Object.keys(goals.dayTargets ?? {}).length} of 7 days have overrides.
        Other days continue using your regular targets.
      </p>
    </details>
  );
}
