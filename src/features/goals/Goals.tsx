import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JourneyIntro } from "@/components/app/JourneyIntro";
import { useSession } from "@/context/Session";
import { WeeklyGoalSchedule } from "./WeeklyGoalSchedule";
import { backend, bumpData } from "@/lib/backend";
import { computeGoals, sanitizeGoalEdit } from "@/lib/nutrition/targets";
import { ACTIVITY_DESCRIPTIONS, ACTIVITY_FACTORS, GOAL_DELTA_KCAL } from "@/lib/nutrition/constants";
import type { ActivityLevel, GoalSet, Objective } from "@/types";
import { LIMITS, type NumericLimitKey } from "@/lib/validation/limits";

const OBJECTIVE_NOTES: Record<Objective, string> = {
  lose: "Moderate deficit, about 0.45 kg per week",
  maintain: "Estimated maintenance energy",
  gain: "Small surplus, about 0.3 kg per week",
  recomp: "Small deficit with high protein",
};

export function Goals() {
  const { profile, goals, refresh } = useSession();
  const [form, setForm] = useState<Partial<GoalSet>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (goals) setForm({ ...goals });
  }, [goals]);

  const set = (key: keyof GoalSet, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const editableKeys = ["calorieTarget", "proteinG", "carbsG", "fatG", "fiberG", "waterMl"] as const;
  const dirty = Boolean(goals && editableKeys.some(key => String(form[key]) !== String(goals[key])));

  const save = async () => {
    const sanitized = sanitizeGoalEdit({ ...form, userId: goals?.userId ?? "" });
    if (!sanitized) {
      toast.error("Check the values: all targets must be inside valid ranges");
      return;
    }
    setBusy(true);
    try {
      await backend.saveGoals({ ...sanitized, userId: goals?.userId ?? "" });
      await refresh();
      bumpData();
      toast.success("Targets updated");
    } catch {
      toast.error("Could not save targets");
    } finally {
      setBusy(false);
    }
  };

  const recalculate = async (objective: Objective) => {
    if (!profile?.sex || !profile.birthYear || !profile.heightCm || !profile.weightKg || !profile.activityLevel) {
      toast.error("Complete your profile in Settings first");
      return;
    }
    const age = new Date().getFullYear() - profile.birthYear;
    const computed = computeGoals({
      sex: profile.sex,
      age,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      activityLevel: profile.activityLevel,
      objective,
    });
    await backend.saveGoals({ ...computed.goals, userId: goals?.userId ?? "" });
    await backend.updateProfile({ objective });
    await refresh();
    bumpData();
    toast.success(`Recalculated for ${objective === "lose" ? "weight loss" : objective === "gain" ? "weight gain" : objective === "recomp" ? "recomposition" : "maintenance"}`);
  };

  const num = (v: unknown) => (v === undefined || v === "" ? "" : String(v));

  return (
    <div className="mm6-subpage mm6-page-goals flex flex-col gap-6">
      <JourneyIntro
        eyebrow="YOUR DAILY PLAN"
        title="Goals"
        description={goals?.method === "placeholder"
          ? "Start with an estimate, then choose targets that work for your routine."
          : "A clear set of daily targets. Edit them any time as your routine changes."}
      />

      <section className="mm-journey-edit-section" aria-label="Daily targets">
        <h2 className="mm-journey-section-title">Daily targets</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These numbers guide your food log. Updating a target never changes what you've eaten.
        </p>
        <div className="mm-journey-goal-grid mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Calories (kcal)" id="g-kcal" limitKey="calorieTarget" value={num(form.calorieTarget)} onChange={(v) => set("calorieTarget", v)} />
          <Field label="Protein (g)" id="g-protein" limitKey="proteinG" value={num(form.proteinG)} onChange={(v) => set("proteinG", v)} />
          <Field label="Carbohydrates (g)" id="g-carbs" limitKey="carbsG" value={num(form.carbsG)} onChange={(v) => set("carbsG", v)} />
          <Field label="Fat (g)" id="g-fat" limitKey="fatG" value={num(form.fatG)} onChange={(v) => set("fatG", v)} />
          <Field label="Fiber (g)" id="g-fiber" limitKey="fiberG" value={num(form.fiberG)} onChange={(v) => set("fiberG", v)} />
          <Field label="Water (ml)" id="g-water" limitKey="waterMl" value={num(form.waterMl)} onChange={(v) => set("waterMl", v)} />
        </div>
        <div className="mm-journey-save-actions mt-5 flex items-center gap-3">
          <Button onClick={save} disabled={busy || !dirty}>{busy ? "Saving…" : "Save targets"}</Button>
          {dirty && <span className="text-xs text-warning">Unsaved changes</span>}
        </div>
      </section>

      <WeeklyGoalSchedule goals={goals} onSaved={refresh} />

      <section className="mm-journey-edit-section mm-journey-recalculation" aria-label="Recalculate">
        <h2 className="mm-journey-section-title">Need a different starting point?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You can recalculate your targets from your profile. Your existing diary remains untouched.
        </p>
        <details className="mm-journey-recalc-toggle">
          <summary>Choose a goal to recalculate</summary>
          <details className="mm-journey-calculation-details">
          <summary>How these estimates are calculated</summary>
          <p className="mt-1 text-xs text-muted-foreground">
          Uses the Mifflin-St Jeor equation with your sex, age, height, weight and activity level
          {profile?.activityLevel ? ` (${ACTIVITY_FACTORS[profile.activityLevel].label}: ${ACTIVITY_DESCRIPTIONS[profile.activityLevel]})` : ""}.
          {profile?.sex ? ` Objective adjustment: ${GOAL_DELTA_KCAL[profile.objective ?? "maintain"] > 0 ? "+" : ""}${GOAL_DELTA_KCAL[profile.objective ?? "maintain"]} kcal.` : ""}
          </p>
          </details>
          <div className="mm-journey-goal-choices mt-4 grid gap-2">
          {(["lose", "maintain", "gain", "recomp"] as Objective[]).map((o) => (
            <Button key={o} variant="outline" onClick={() => void recalculate(o)}
              className="h-auto min-h-16 min-w-0 flex-col items-start justify-center gap-1 overflow-hidden px-4 py-3 text-left whitespace-normal">
              <span className="block max-w-full text-sm font-semibold">
                {o === "recomp" ? "Recomposition" : o === "lose" ? "Lose weight" : o === "gain" ? "Gain weight" : "Maintain"}
              </span>
              <span className="block max-w-full text-xs leading-5 text-muted-foreground">
                {OBJECTIVE_NOTES[o].split(",")[0]}
              </span>
            </Button>
          ))}
          </div>
        </details>
      </section>
    </div>
  );
}

function Field({ label, id, value, limitKey, onChange }: {
  label: string; id: string; value: string; limitKey: NumericLimitKey;
  onChange: (v: string) => void;
}) {
  const limit = LIMITS[limitKey];
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="min-w-0 w-full" type="number" min={limit.min} max={limit.max} step={1}
        aria-describedby={`${id}-limit`} inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} />
      <p id={`${id}-limit`} className="sr-only">Accepts values from {limit.min} to {limit.max}.</p>
    </div>
  );
}
