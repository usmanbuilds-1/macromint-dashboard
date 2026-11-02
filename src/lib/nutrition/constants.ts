import type { ActivityLevel, NutrientMeta, NutrientKey, Objective, Sex } from "@/types";

// ── Display metadata ──────────────────────────────────────────────────────
export const UNIT_LABELS: Record<string, string> = {
  g: "g",
  mg: "mg",
  µg: "mcg",
};

export function nutrientUnit(meta: NutrientMeta): string {
  return UNIT_LABELS[meta.unit] ?? meta.unit;
}

/** Which nutrients appear in compact macro rows across the app. */
export const SUMMARY_MICROS: NutrientKey[] = ["fiber", "sugar", "sodium"];

// ── Energy expenditure ────────────────────────────────────────────────────
export const ACTIVITY_FACTORS: Record<ActivityLevel, { factor: number; label: string }> = {
  sedentary: { factor: 1.2, label: "Sedentary" },
  light: { factor: 1.375, label: "Lightly active" },
  moderate: { factor: 1.55, label: "Moderately active" },
  active: { factor: 1.725, label: "Very active" },
  very_active: { factor: 1.9, label: "Athlete" },
};

export const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  sedentary: "Desk work, little or no exercise",
  light: "Light exercise 1 to 3 days a week",
  moderate: "Moderate exercise 3 to 5 days a week",
  active: "Hard exercise 6 to 7 days a week",
  very_active: "Physical job or training twice a day",
};

// ── Goal adjustments ──────────────────────────────────────────────────────
export const GOAL_DELTA_KCAL: Record<Objective, number> = {
  lose: -500,
  maintain: 0,
  gain: 350,
  recomp: -150,
};

export const PROTEIN_G_PER_KG: Record<Objective, number> = {
  lose: 2.0,
  maintain: 1.6,
  gain: 1.8,
  recomp: 2.2,
};

export const FAT_SHARE_OF_KCAL: Record<Objective, number> = {
  lose: 0.28,
  maintain: 0.3,
  gain: 0.3,
  recomp: 0.28,
};

/** Safety floors from public health guidance, not medical advice. */
export const MIN_KCAL: Record<Sex, number> = { male: 1500, female: 1200 };

export const FIBER_G_PER_1000_KCAL = 14;
export const WATER_ML_PER_KG = 35;

// ── Adherence ─────────────────────────────────────────────────────────────
export const ADHERENCE_RELATIVE_TOLERANCE = 0.1;
export const ADHERENCE_ABS_TOLERANCE_KCAL = 150;
export const ADHERENCE_CONSISTENT_RATIO = 0.7;

// ── Scan validation bounds ────────────────────────────────────────────────
export const SCAN_MAX_ITEM_KCAL = 2000;
export const SCAN_MAX_ITEM_GRAMS = 1500;
export const SCAN_ATWATER_TOLERANCE = 0.25;
