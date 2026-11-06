import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/context/Session";
import { backend, bumpData } from "@/lib/backend";
import { useAsyncData } from "@/hooks/useData";
import { todayStr } from "@/lib/nutrition/datetime";
import { estimateAdultEnergy, type EnergyAssessment } from "@/lib/weight/energy";
import { evaluateWeightTrend, type WeightTrendAnalysis } from "@/lib/weight/trends";
import { estimateWeightTimeline, weightTimelineLabel } from "@/lib/weight/timeline";
import { LIMITS, validateNumeric } from "@/lib/validation/limits";
import type { WeightEntry } from "@/types";
import { JourneyIntro } from "@/components/app/JourneyIntro";

/** Full weight log and estimates, accessible from the Trends page. */
const POUNDS_PER_KG = 2.2046226218487757;
export interface WeightProgressModuleProps {
  /** Optional callback for an outer page to refresh additional dependent data. */
  onSaved?: (entry: WeightEntry) => void;
}
function isoDateIsValid(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const ms = Date.parse(s + "T00:00:00.000Z");
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === s;
}

/**
 * Use on authenticated pages. The Trends page links to the dedicated weight journey.
 * The existing backend already upserts one RLS-protected entry per user/day.
 * No schema migration, localStorage or privileged API is introduced here.
 */
export function WeightProgressModule({ onSaved }: WeightProgressModuleProps) {
  const { profile, refresh } = useSession();
  const today = todayStr();
  const weightsState = useAsyncData(() => backend.getWeights(90), [], "weights:90");
  const weights = weightsState.data ?? [];
  const isImperial = profile?.units === "imperial";
  const units = isImperial ? "lb" : "kg";

  const [weightText, setWeightText] = useState("");
  const [logDate, setLogDate] = useState(today);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [targetText, setTargetText] = useState("");
  const [targetBusy, setTargetBusy] = useState(false);

  const trend = useMemo<WeightTrendAnalysis | null>(
    () => profile?.objective ? evaluateWeightTrend(weights, profile.objective, today) : null,
    [weights, profile?.objective, today],
  );

  const energy = useMemo<EnergyAssessment | null>(() => {
    const p = profile;
    if (!p || p.sex === null || p.birthYear === null || p.heightCm === null ||
        p.weightKg === null || p.activityLevel === null || p.objective === null) return null;
    const latestKg = [...weights].sort((a, b) => b.entryDate.localeCompare(a.entryDate))[0]?.weightKg ?? p.weightKg;
    const approximateAge = new Date().getFullYear() - p.birthYear;
    try {
      return estimateAdultEnergy({
        ageYears: approximateAge, sex: p.sex, heightCm: p.heightCm,
        weightKg: latestKg, activityLevel: p.activityLevel, objective: p.objective,
      });
    } catch {
      return null;
    }
  }, [profile, weights]);

  const latestKg = [...weights].sort((a, b) => b.entryDate.localeCompare(a.entryDate))[0]?.weightKg ?? profile?.weightKg ?? null;
  const timeline = useMemo(() => {
    if (!profile?.objective || profile.heightCm === null || latestKg === null || profile.targetWeightKg === null) return null;
    return estimateWeightTimeline({
      currentKg: latestKg,
      targetKg: profile.targetWeightKg,
      heightCm: profile.heightCm,
      objective: profile.objective,
    });
  }, [profile?.objective, profile?.heightCm, profile?.targetWeightKg, latestKg]);

  async function saveTarget() {
    const value = validateNumeric(targetText, isImperial ? "weightLb" : "weightKg", "Target weight");
    if ("error" in value) { toast.error(value.error); return; }
    const targetKg = isImperial ? value.value / POUNDS_PER_KG : value.value;
    if (profile?.heightCm && profile.objective && latestKg != null) {
      const assessment = estimateWeightTimeline({
        currentKg: latestKg, targetKg, heightCm: profile.heightCm, objective: profile.objective,
      });
      if (["invalid_input", "review_target", "objective_mismatch"].includes(assessment.status)) {
        toast.error(assessment.note); return;
      }
    }
    setTargetBusy(true);
    try {
      await backend.updateProfile({ targetWeightKg: Math.round(targetKg * 100) / 100 });
      await refresh();
      bumpData();
      setTargetText("");
      toast.success("Target weight updated");
    } catch {
      toast.error("Unable to update your target");
    } finally {
      setTargetBusy(false);
    }
  }

  async function save() {
    const result = validateNumeric(weightText, isImperial ? "weightLb" : "weightKg", "Weight");
    if ("error" in result) { toast.error(result.error); return; }
    const kg = isImperial ? result.value / POUNDS_PER_KG : result.value;
    if (!isoDateIsValid(logDate) || logDate > today) {
      toast.error("Choose a valid date, no later than today");
      return;
    }
    if (note.length > 250) {
      toast.error("Keep your optional note under 250 characters");
      return;
    }
    setBusy(true);
    try {
      const saved = await backend.addWeight(logDate, Math.round(kg * 100) / 100, note.trim() || undefined);
      bumpData();
      setWeightText("");
      setNote("");
      toast.success("Weight recorded");
      onSaved?.(saved);
    } catch {
      toast.error("Could not save your weight. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mm-journey-weight flex w-full max-w-2xl flex-col gap-6" aria-label="Weight journal">
      <JourneyIntro
        eyebrow="THE LONGER VIEW"
        title="Weight"
        description="A record of real weigh-ins and your progress over time. One reading never tells the full story."
      />

      <div className="mm-journey-weight-current" aria-label="Latest recorded weight">
        <span>CURRENT WEIGHT</span>
        <div><strong>{latestKg === null ? "—" : (latestKg * (isImperial ? POUNDS_PER_KG : 1)).toFixed(1)}</strong><small>{units}</small></div>
        <p>{weights.length > 0
          ? "From your most recent saved weigh-in."
          : latestKg === null
            ? "Add your first weigh-in to start the trend."
            : "From your profile. Record a weigh-in to build your trend."}</p>
      </div>
      <form className="mm-journey-weight-form grid gap-4 border-b pb-6" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="weight-module-value">Weight ({units})</Label>
            <Input id="weight-module-value" inputMode="decimal" type="number" step="any" min={isImperial ? LIMITS.weightLb.min : LIMITS.weightKg.min}
              max={isImperial ? LIMITS.weightLb.max : LIMITS.weightKg.max}
              value={weightText} onChange={e => setWeightText(e.target.value)} placeholder={isImperial ? "172.4" : "78.2"} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="weight-module-date">Measured on</Label>
            <Input id="weight-module-date" type="date" value={logDate} max={today} required
              onChange={e => setLogDate(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="weight-module-note">Note (optional)</Label>
          <Input id="weight-module-note" value={note} maxLength={250}
            onChange={e => setNote(e.target.value)} placeholder="Morning, before breakfast" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">One entry per day. Saving the same date replaces that day's reading.</p>
          <Button type="submit" className="min-h-11" disabled={busy || !weightText.trim()}>
            {busy ? "Saving…" : "Save weight"}
          </Button>
        </div>
      </form>

      {weightsState.loading && !weightsState.data && <p role="status" className="text-sm text-muted-foreground">Loading your weigh-ins…</p>}
      {weightsState.error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-sm text-destructive">
          Your weight log could not load.
          <Button variant="outline" size="sm" onClick={weightsState.reload}>Retry</Button>
        </div>
      )}

      <section className="border-b pb-6" aria-labelledby="goal-weight-heading">
        <h3 id="goal-weight-heading" className="mm-journey-section-title">Target weight</h3>
        <p className="mt-1 text-xs text-muted-foreground">Set a destination for a realistic planning range. You can revise it anytime.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="grid max-w-[190px] gap-1.5">
            <Label htmlFor="weight-module-target">Target ({units})</Label>
            <Input id="weight-module-target" type="number" step="any"
              min={isImperial ? LIMITS.weightLb.min : LIMITS.weightKg.min}
              max={isImperial ? LIMITS.weightLb.max : LIMITS.weightKg.max}
              value={targetText}
              onChange={e => setTargetText(e.target.value)}
              placeholder={profile?.targetWeightKg ? (profile.targetWeightKg * (isImperial ? POUNDS_PER_KG : 1)).toFixed(1) : "Set your goal"} />
          </div>
          <Button type="button" className="min-h-10" onClick={() => void saveTarget()}
            disabled={targetBusy || !targetText.trim()}>{targetBusy ? "Saving…" : "Update target"}</Button>
        </div>
        {profile?.targetWeightKg !== null && profile?.targetWeightKg !== undefined && (
          <p className="mt-3 text-sm">Current target: <strong>{(profile.targetWeightKg * (isImperial ? POUNDS_PER_KG : 1)).toFixed(1)} {units}</strong></p>
        )}
        {timeline && (
          <div className="mt-3 border-l-2 border-primary pl-3">
            <strong className="text-sm">{weightTimelineLabel(timeline)}</strong>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{timeline.note}</p>
          </div>
        )}
      </section>

      {trend && (
        <section aria-labelledby="weight-trend-heading" className="border-b pb-5">
          <h3 id="weight-trend-heading" className="mm-journey-section-title">Weight trend</h3>
          <div className="mt-2">
            <p className="text-sm font-medium">{trend.status === "possible_plateau"
              ? "Possible plateau"
              : trend.status === "insufficient_data" ? "Building your baseline"
              : trend.status === "inconclusive" ? "Trend unclear"
              : trend.status === "maintenance_stable" ? "Weight broadly stable"
              : trend.status === "maintenance_drifting" ? "Weight changing"
              : trend.status === "opposite_direction" ? "Moving away from target"
              : "Trend developing"}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{trend.nextStep}</p>
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">
              {trend.loggedDays}/28 weigh-in days
              {trend.weeklyTrendKg !== null
                ? ` · ${trend.weeklyTrendKg > 0 ? "+" : ""}${trend.weeklyTrendKg.toFixed(2)} kg/week`
                : ""}
            </p>
          </div>
        </section>
      )}

      {energy && (
        <section aria-labelledby="weight-energy-heading" className="border-b pb-5">
          <h3 id="weight-energy-heading" className="mm-journey-section-title">Estimated energy needs</h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4">
            {[
              ["BMI (adult screening)", energy.bmi.value.toFixed(1)],
              ["Resting energy / BMR", `${energy.bmrKcal.toLocaleString()} kcal/day`],
              ["Estimated maintenance", `${energy.maintenanceKcal.toLocaleString()} kcal/day`],
              ["Goal starting target", energy.suggestedTargetKcal === null ? "Review needed" : `${energy.suggestedTargetKcal.toLocaleString()} kcal/day`],
            ].map(([name, value]) => (
              <div key={name}><dt className="text-xs text-muted-foreground">{name}</dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd></div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Based on Mifflin–St Jeor, your saved activity and approximate age calculated from birth year.
            Estimates are not a measured metabolic rate, and are never automatically applied to your targets.
            BMI is a screening measure, not a diagnosis.
          </p>
        </section>
      )}

      {!energy && <p className="text-sm text-muted-foreground">
        Complete your adult profile (height, birth year, biological sex for the equation, activity and goal) to view energy estimates.
      </p>}
    </section>
  );
}
