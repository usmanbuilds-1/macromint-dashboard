import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/app/AppLayout";
import { backend } from "@/lib/backend";
import { useSession } from "@/context/Session";
import { computeGoals } from "@/lib/nutrition/targets";
import { LIMITS, withinLimit } from "@/lib/validation/limits";
import { estimateWeightTimeline, weightTimelineLabel } from "@/lib/weight/timeline";
import { ACTIVITY_DESCRIPTIONS, ACTIVITY_FACTORS } from "@/lib/nutrition/constants";
import type { ActivityLevel, Objective, Sex, Units } from "@/types";
import { cn } from "@/lib/utils";

const OBJECTIVES: Array<{ value: Objective; label: string; note: string }> = [
  { value: "lose", label: "Lose weight", note: "A moderate daily deficit" },
  { value: "maintain", label: "Maintain weight", note: "Eat at maintenance" },
  { value: "gain", label: "Gain weight", note: "A small daily surplus" },
  { value: "recomp", label: "Body recomposition", note: "Small deficit, high protein" },
];

const ACTIVITY_LEVELS: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];

export function Onboarding() {
  const navigate = useNavigate();
  const { profile, refresh } = useSession();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState(profile?.name ?? "");
  const [units, setUnits] = useState<Units>(profile?.units ?? "metric");
  const [sex, setSex] = useState<Sex | null>(profile?.sex ?? null);
  const [age, setAge] = useState<string>(profile?.birthYear ? String(new Date().getFullYear() - profile.birthYear) : "");
  const [heightCm, setHeightCm] = useState<string>(profile?.heightCm ? String(profile.heightCm) : "");
  const [weightKg, setWeightKg] = useState<string>(profile?.weightKg ? String(profile.weightKg) : "");
  const [targetWeightKg, setTargetWeightKg] = useState<string>(profile?.targetWeightKg ? String(profile.targetWeightKg) : "");
  const [objective, setObjective] = useState<Objective | null>(profile?.objective ?? null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(profile?.activityLevel ?? null);

  const ageNum = Number(age);
  const heightNum = Number(heightCm);
  const weightNum = Number(weightKg);
  const personalValid =
    sex !== null && withinLimit(age, "ageYears") && Number.isInteger(ageNum) &&
    withinLimit(heightCm, "heightCm") && withinLimit(weightKg, "weightKg") && name.trim().length <= 100;
  const targetRequested = targetWeightKg.trim().length > 0;
  const timeline = useMemo(() => {
    if (!objective || !personalValid || !targetRequested || !withinLimit(targetWeightKg, "weightKg")) return null;
    return estimateWeightTimeline({
      currentKg: weightNum, targetKg: Number(targetWeightKg), heightCm: heightNum, objective,
    });
  }, [objective, personalValid, targetRequested, targetWeightKg, weightNum, heightNum]);
  const goalTargetValid = !targetRequested ||
    (withinLimit(targetWeightKg, "weightKg") &&
     timeline !== null &&
     !["invalid_input", "objective_mismatch", "review_target"].includes(timeline.status));

  const computed = useMemo(() => {
    if (!sex || !personalValid || !goalTargetValid || !objective || !activityLevel) return null;
    const bmi = weightNum / ((heightNum / 100) ** 2);
    if (bmi < 18.5 && (objective === "lose" || objective === "recomp")) return null;
    return computeGoals({ sex, age: ageNum, heightCm: heightNum, weightKg: weightNum, activityLevel, objective });
  }, [sex, personalValid, goalTargetValid, objective, activityLevel, ageNum, heightNum, weightNum]);

  const steps = ["About you", "Objective", "Activity", "Your targets"];

  const finish = async () => {
    if (!computed || !sex || !objective || !activityLevel) return;
    setBusy(true);
    try {
      await backend.updateProfile({
        name: name.trim(),
        units,
        sex,
        birthYear: new Date().getFullYear() - ageNum,
        heightCm: heightNum,
        weightKg: weightNum,
        targetWeightKg: targetRequested ? Number(targetWeightKg) : null,
        activityLevel,
        objective,

      });
      await backend.saveGoals(computed.goals);
      await backend.updateProfile({ onboardedAt: new Date().toISOString() });
      await refresh();
      toast.success("Targets saved. You can adjust them any time in Goals.");
      navigate("/today", { replace: true });
    } catch {
      toast.error("Could not save your profile. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    try {
      // Mark onboarding complete with placeholder goals; the user can adjust
      // everything later in Goals. Skipping never blocks the app.
      await backend.updateProfile({ name: name.trim() || "You", units, onboardedAt: new Date().toISOString() });
      await refresh();
      navigate("/today", { replace: true });
    } catch {
      toast.error("Could not skip onboarding");
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8 sm:px-5 sm:pt-12">
      <div className="flex items-center justify-between">
        <Logo />
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          Step {step + 1} of {steps.length}
        </span>
      </div>

      <p className="sr-only" role="status">Setup progress: {steps[step]}, step {step + 1} of {steps.length}</p>
      <div className="mt-6 flex gap-1.5" aria-hidden="true">
        {steps.map((_, i) => (
          <div key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-secondary")} />
        ))}
      </div>

      <div className="mt-10 flex-1">
        {step === 0 && (
          <div className="flex flex-col gap-6">
            <header>
              <h1 className="text-2xl font-semibold tracking-tight">A few basics</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                These details help estimate your starting targets. They are not exact measurements of your daily energy needs, and you can edit them later.
              </p>
            </header>
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="ob-name">What should we call you?</Label>
                <Input id="ob-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="grid gap-1.5">
                <Label>Measurement system</Label>
                <RadioGroup value={units} onValueChange={(v) => setUnits(v as Units)} className="flex gap-3">
                  {(["metric", "imperial"] as Units[]).map((u) => (
                    <Label key={u} className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-normal capitalize has-[button[data-state=checked]]:border-primary">
                      <RadioGroupItem value={u} /> {u}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
              <div className="grid gap-1.5">
                <Label>Sex (used by the energy equation)</Label>
                <RadioGroup value={sex ?? ""} onValueChange={(v) => setSex(v as Sex)} className="flex gap-3">
                  {(["male", "female"] as Sex[]).map((sx) => (
                    <Label key={sx} className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-normal capitalize has-[button[data-state=checked]]:border-primary">
                      <RadioGroupItem value={sx} /> {sx}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="ob-age">Age</Label>
                  <Input id="ob-age" type="number" min={LIMITS.ageYears.min} max={LIMITS.ageYears.max} step={1} inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} placeholder="30" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ob-height">Height (cm)</Label>
                  <Input id="ob-height" type="number" min={LIMITS.heightCm.min} max={LIMITS.heightCm.max} step="any" inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="176" />
                </div>
                <div className="col-span-2 grid gap-1.5 sm:col-span-1">
                  <Label htmlFor="ob-weight">Weight (kg)</Label>
                  <Input id="ob-weight" type="number" min={LIMITS.weightKg.min} max={LIMITS.weightKg.max} step="any" inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="78" />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-6">
            <header>
              <h1 className="text-2xl font-semibold tracking-tight">What are you working towards?</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">This shapes your calorie and protein targets.</p>
            </header>
            <RadioGroup value={objective ?? ""} onValueChange={(v) => setObjective(v as Objective)} className="flex flex-col gap-3">
              {OBJECTIVES.map((o) => (
                <Label key={o.value} className="flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3.5 font-normal has-[button[data-state=checked]]:border-primary">
                  <RadioGroupItem value={o.value} className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="block text-xs text-muted-foreground">{o.note}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
            <div className="grid gap-2">
              <Label htmlFor="ob-target-weight">Target weight (kg, optional)</Label>
              <Input id="ob-target-weight" type="number" min={LIMITS.weightKg.min} max={LIMITS.weightKg.max}
                step="any" inputMode="decimal" value={targetWeightKg} onChange={(e) => setTargetWeightKg(e.target.value)}
                placeholder="e.g. 74" aria-describedby="ob-target-help" />
              <p id="ob-target-help" className="text-xs text-muted-foreground">
                Set a destination to see an illustrative timeline. You can change it anytime.
              </p>
              {targetRequested && !goalTargetValid && (
                <p role="alert" className="text-xs text-destructive">
                  {timeline?.note ?? `Target weight must be between ${LIMITS.weightKg.min} and ${LIMITS.weightKg.max} kg.`}
                </p>
              )}
              {timeline && goalTargetValid && (
                <div className="border-l-2 border-primary pl-3 text-sm">
                  <strong>{weightTimelineLabel(timeline)}</strong>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{timeline.note}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <header>
              <h1 className="text-2xl font-semibold tracking-tight">How active are you?</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Outside of logging food, most of your energy spend is daily movement.</p>
            </header>
            <RadioGroup value={activityLevel ?? ""} onValueChange={(v) => setActivityLevel(v as ActivityLevel)} className="flex flex-col gap-3">
              {ACTIVITY_LEVELS.map((a) => (
                <Label key={a} className="flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3.5 font-normal has-[button[data-state=checked]]:border-primary">
                  <RadioGroupItem value={a} className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium">{ACTIVITY_FACTORS[a].label} (× {ACTIVITY_FACTORS[a].factor})</span>
                    <span className="block text-xs text-muted-foreground">{ACTIVITY_DESCRIPTIONS[a]}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        )}

        {step === 3 && computed && (
          <div className="flex flex-col gap-6">
            <header>
              <h1 className="text-2xl font-semibold tracking-tight">Your starting targets</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Estimates, not medical prescriptions. Adjust them whenever you like in Goals.
              </p>
            </header>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Daily calories</span>
                <span className="text-2xl font-semibold tabular-nums">{computed.goals.calorieTarget.toLocaleString("en-US")}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-center">
                <div>
                  <p className="text-lg font-semibold tabular-nums">{computed.goals.proteinG}g</p>
                  <p className="text-xs text-muted-foreground">Protein</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">{computed.goals.carbsG}g</p>
                  <p className="text-xs text-muted-foreground">Carbs</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">{computed.goals.fatG}g</p>
                  <p className="text-xs text-muted-foreground">Fat</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-sm font-medium">How this was calculated</h2>
              <dl className="mt-3 flex flex-col gap-2.5">
                {computed.breakdown.map((line) => (
                  <div key={line.label} className="flex items-baseline justify-between gap-4">
                    <dt className="text-xs text-muted-foreground">
                      {line.label}
                      {line.note && <span className="block text-[11px] text-muted-foreground/70">{line.note}</span>}
                    </dt>
                    <dd className="whitespace-nowrap text-sm font-medium tabular-nums">{line.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {step === 3 && !computed && (
          <p className="text-sm text-muted-foreground">Go back and complete the earlier steps.</p>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between gap-3 border-t pt-5">
        <Button className="min-h-11" variant="ghost" onClick={() => step === 0 ? void skip() : setStep((s) => s - 1)} disabled={busy}>
          <ArrowLeft className="h-4 w-4" /> {step === 0 ? "Skip for now" : "Back"}
        </Button>
        {step < 3 ? (
          <Button className="min-h-11" onClick={() => setStep((s) => s + 1)} disabled={(step === 0 && !personalValid) || (step === 1 && (!objective || !goalTargetValid)) || (step === 2 && !activityLevel)}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="min-h-11" onClick={finish} disabled={!computed || busy}>
            {busy ? "Saving…" : "Start tracking"} <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function OnboardingUnitsSelect() {
  // Re-exported convenience for potential reuse in Settings.
  return <SelectValue />;
}
