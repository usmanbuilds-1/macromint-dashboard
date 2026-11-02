import type { ActivityLevel, GoalSet, Objective, Sex } from "@/types";
import {
  ACTIVITY_FACTORS,
  FAT_SHARE_OF_KCAL,
  FIBER_G_PER_1000_KCAL,
  GOAL_DELTA_KCAL,
  MIN_KCAL,
  PROTEIN_G_PER_KG,
  WATER_ML_PER_KG,
} from "./constants";

// ── Mifflin-St Jeor ───────────────────────────────────────────────────────
export function mifflinStJeorBmr(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return Math.round(input.sex === "male" ? base + 5 : base - 161);
}

export function tdee(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activityLevel].factor);
}

// ── Transparent goal derivation ───────────────────────────────────────────
export interface GoalInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  objective: Objective;
}

export interface GoalBreakdownLine {
  label: string;
  value: string;
  note?: string;
}

export interface ComputedGoals {
  goals: Omit<GoalSet, "userId">;
  breakdown: GoalBreakdownLine[];
}

/**
 * Derive initial targets from a recognised equation (Mifflin-St Jeor) and
 * publish-health-informed adjustments. Every step is returned so onboarding
 * can show exactly how the numbers were produced. Targets are estimates,
 * never a medical prescription.
 */
export function computeGoals(input: GoalInput): ComputedGoals {
  const bmr = mifflinStJeorBmr(input);
  const maintenance = tdee(bmr, input.activityLevel);

  const rawTarget = maintenance + GOAL_DELTA_KCAL[input.objective];
  const floor = MIN_KCAL[input.sex];
  const floored = rawTarget < floor;
  const calorieTarget = Math.max(rawTarget, floor);

  const proteinG = Math.round(PROTEIN_G_PER_KG[input.objective] * input.weightKg);
  const fatG = Math.round((calorieTarget * FAT_SHARE_OF_KCAL[input.objective]) / 9);
  const kcalFromPf = proteinG * 4 + fatG * 9;
  const carbsG = Math.max(0, Math.round((calorieTarget - kcalFromPf) / 4));
  const fiberG = Math.round((calorieTarget / 1000) * FIBER_G_PER_1000_KCAL);
  const waterMl = Math.round(input.weightKg * WATER_ML_PER_KG / 100) * 100;

  const objectiveNote: Record<Objective, string> = {
    lose: "Approximately 0.45 kg per week",
    maintain: "Eat at estimated maintenance",
    gain: "Approximately 0.3 kg per week",
    recomp: "Small deficit with high protein",
  };

  const breakdown: GoalBreakdownLine[] = [
    {
      label: "Basal metabolic rate (Mifflin-St Jeor)",
      value: `${bmr.toLocaleString("en-US")} kcal`,
      note: "Energy your body uses at complete rest",
    },
    {
      label: `Maintenance energy (× ${ACTIVITY_FACTORS[input.activityLevel].factor})`,
      value: `${maintenance.toLocaleString("en-US")} kcal`,
      note: "BMR scaled by your activity level",
    },
    {
      label: "Objective adjustment",
      value: `${GOAL_DELTA_KCAL[input.objective] > 0 ? "+" : ""}${GOAL_DELTA_KCAL[input.objective]} kcal`,
      note: objectiveNote[input.objective],
    },
    ...(floored
      ? [
          {
            label: "Safety floor applied",
            value: `${floor.toLocaleString("en-US")} kcal`,
            note: "The computed target was below the published minimum and was raised",
          },
        ]
      : []),
    { label: "Daily calorie target", value: `${calorieTarget.toLocaleString("en-US")} kcal` },
    {
      label: `Protein (${PROTEIN_G_PER_KG[input.objective]} g per kg body weight)`,
      value: `${proteinG} g`,
    },
    { label: `Fat (${Math.round(FAT_SHARE_OF_KCAL[input.objective] * 100)}% of energy)`, value: `${fatG} g` },
    { label: "Carbohydrates (remaining energy)", value: `${carbsG} g` },
    { label: "Fiber (14 g per 1,000 kcal)", value: `${fiberG} g` },
    { label: "Water (35 ml per kg)", value: `${(waterMl / 1000).toFixed(1)} L` },
  ];

  return {
    goals: {
      calorieTarget,
      proteinG,
      carbsG,
      fatG,
      fiberG,
      waterMl,
      method: "mifflin_st_jeor",
      manuallyAdjusted: false,
    },
    breakdown,
  };
}

/** Revalidate a manually edited goal set (used by Goals and Settings). */
export function sanitizeGoalEdit(g: Partial<GoalSet>): GoalSet | null {
  const num = (v: unknown, min: number, max: number): number | null => {
    const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
    if (!Number.isFinite(n) || n < min || n > max) return null;
    return Math.round(n);
  };
  const calorieTarget = num(g.calorieTarget, 800, 10000);
  const proteinG = num(g.proteinG, 10, 500);
  const carbsG = num(g.carbsG, 0, 1200);
  const fatG = num(g.fatG, 10, 400);
  const fiberG = num(g.fiberG, 0, 150);
  const waterMl = num(g.waterMl, 500, 8000);
  if (calorieTarget === null || proteinG === null || carbsG === null || fatG === null || fiberG === null || waterMl === null) {
    return null;
  }
  return {
    userId: g.userId ?? "",
    calorieTarget,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    waterMl,
    method: g.method ?? "manual",
    manuallyAdjusted: true,
  };
}
