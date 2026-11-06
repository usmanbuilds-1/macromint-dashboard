import type {
  Confidence,
  GoalSet,
  NutrientKey,
  NutrientRecord,
  DiaryEntry,
} from "@/types";
import {
  ADHERENCE_ABS_TOLERANCE_KCAL,
  ADHERENCE_CONSISTENT_RATIO,
  ADHERENCE_RELATIVE_TOLERANCE,
  SCAN_ATWATER_TOLERANCE,
  SCAN_MAX_ITEM_GRAMS,
  SCAN_MAX_ITEM_KCAL,
} from "./constants";
import { roundTo } from "@/lib/utils";

// ── Nutrient arithmetic (null-aware) ──────────────────────────────────────
const DP: Partial<Record<NutrientKey, number>> = {
  kcal: 0,
  protein: 1,
  carbs: 1,
  fat: 1,
};

function roundNutrient(key: NutrientKey, v: number): number {
  return roundTo(v, DP[key] ?? 1);
}

/**
 * Scale a per-100g profile to an eaten amount: per100g × grams/100 × pct/100.
 * Null values stay null (unavailable is never treated as zero).
 */
export function scaleNutrients(
  per100g: NutrientRecord,
  grams: number,
  portionPercent = 100,
): NutrientRecord {
  const factor = (grams / 100) * (portionPercent / 100);
  const out: NutrientRecord = {};
  for (const [key, value] of Object.entries(per100g) as [NutrientKey, number | null][]) {
    if (value === null || value === undefined) {
      out[key] = null;
    } else {
      out[key] = roundNutrient(key, value * factor);
    }
  }
  return out;
}

/**
 * Recompute the nutrients of a scan item using the ORIGINAL scan estimate.
 * Callers must retain the original amount/profile, not repeatedly scale the
 * edited record: repeated edits must not introduce rounding drift.
 * Undefined nutrients remain unavailable, rather than becoming fake zeroes.
 */
export function rescaleScanNutrients(
  original: NutrientRecord,
  originalGrams: number,
  editedGrams: number,
): NutrientRecord {
  if (!Number.isFinite(originalGrams) || originalGrams <= 0 ||
      !Number.isFinite(editedGrams) || editedGrams <= 0) {
    throw new RangeError("Scan portions must be positive finite gram amounts");
  }
  // scaleNutrients rounds each displayed nutrient once from its baseline.
  return scaleNutrients(original, (editedGrams / originalGrams) * 100);
}

/** Sum nutrient records. A key sums to null only when every record lacks it. */
export function sumNutrients(records: NutrientRecord[]): NutrientRecord {
  const out: NutrientRecord = {};
  for (const rec of records) {
    for (const [key, value] of Object.entries(rec) as [NutrientKey, number | null][]) {
      if (value === null || value === undefined) continue;
      out[key] = roundNutrient(key, (out[key] ?? 0) + value);
    }
  }
  return out;
}

/** Diary entries → eaten totals for a day (or any entry list). */
export function dailyTotals(entries: DiaryEntry[]): NutrientRecord {
  return sumNutrients(entries.map((e) => e.nutrients));
}

/** Recompute eaten nutrients from base + percent (portion editing). */
export function applyPortionPercent(base: NutrientRecord, portionPercent: number): NutrientRecord {
  const factor = portionPercent / 100;
  const out: NutrientRecord = {};
  for (const [key, value] of Object.entries(base) as [NutrientKey, number | null][]) {
    out[key] = value === null || value === undefined ? null : roundNutrient(key, value * factor);
  }
  return out;
}

// ── Validation ────────────────────────────────────────────────────────────
/** Calories implied by macro totals using Atwater factors (4/4/9). */
export function atwaterKcal(rec: NutrientRecord): number {
  const p = rec.protein ?? 0;
  const c = rec.carbs ?? 0;
  const f = rec.fat ?? 0;
  return p * 4 + c * 4 + f * 9;
}

export interface PlausibilityCheck {
  ok: boolean;
  issues: string[];
}

/**
 * Sanity-check a nutrient record for a single food or meal portion.
 * Used by the scan accuracy pipeline to downgrade implausible model output.
 */
export function checkPlausibility(rec: NutrientRecord): PlausibilityCheck {
  const issues: string[] = [];
  const kcal = rec.kcal ?? 0;
  const protein = rec.protein ?? 0;
  const carbs = rec.carbs ?? 0;
  const fat = rec.fat ?? 0;

  if (kcal < 0 || kcal > SCAN_MAX_ITEM_KCAL) issues.push("Calories outside the plausible range");
  if (protein < 0 || carbs < 0 || fat < 0) issues.push("Negative macro value");

  const implied = atwaterKcal(rec);
  // Without all three macronutrients the Atwater number is only a lower bound.
  // A partially known food must not be flagged as inconsistent on that basis.
  if ([rec.protein, rec.carbs, rec.fat].every((value) => typeof value === "number" && Number.isFinite(value)) && implied > 20 && kcal > 20) {
    const deviation = Math.abs(kcal - implied) / Math.max(implied, kcal);
    if (deviation > SCAN_ATWATER_TOLERANCE) {
      issues.push(`Calories are inconsistent with the macros (Atwater check off by ${Math.round(deviation * 100)}%)`);
    }
  }
  return { ok: issues.length === 0, issues };
}

/** Portion bounds for a scanned item (grams and its energy). */
export function checkItemBounds(grams: number, kcal: number): PlausibilityCheck {
  const issues: string[] = [];
  if (!Number.isFinite(grams) || grams <= 0 || grams > SCAN_MAX_ITEM_GRAMS) {
    issues.push("Estimated portion size is outside the plausible range");
  }
  if (!Number.isFinite(kcal) || kcal < 0 || kcal > SCAN_MAX_ITEM_KCAL) {
    issues.push("Estimated energy is outside the plausible range");
  }
  return { ok: issues.length === 0, issues };
}

// ── Adherence ─────────────────────────────────────────────────────────────
export type AdherenceLabel = "consistent" | "under" | "over";

export interface AdherenceStats {
  loggedDays: number;
  onTargetDays: number;
  /** Percentage of logged days within tolerance. null when nothing logged. */
  adherencePct: number | null;
  label: AdherenceLabel | null;
  averageKcalLogged: number | null;
  averageKcalFullWeek: number;
  totalKcal: number;
}

/** Tolerance around the calorie target: ±10%, or ±150 kcal without a target. */
export function adherenceTolerance(calorieTarget: number): number {
  return calorieTarget > 0
    ? calorieTarget * ADHERENCE_RELATIVE_TOLERANCE
    : ADHERENCE_ABS_TOLERANCE_KCAL;
}

/**
 * Adherence over a window of days. Bingeing never scores 100%: a day only
 * counts as on-target when its calories sit within tolerance of the target.
 */
export function adherenceStats(
  days: { date: string; kcal: number | null }[],
  calorieTarget: number,
): AdherenceStats {
  const logged = days.filter((d): d is { date: string; kcal: number } => d.kcal !== null);
  const tolerance = adherenceTolerance(calorieTarget);
  const onTargetDays = logged.filter((d) => Math.abs(d.kcal - calorieTarget) <= tolerance).length;
  const totalKcal = logged.reduce((s, d) => s + d.kcal, 0);
  const averageKcalLogged = logged.length ? Math.round(totalKcal / logged.length) : null;
  const averageKcalFullWeek = Math.round(totalKcal / Math.max(days.length, 1));

  const adherencePct = logged.length ? Math.round((onTargetDays / logged.length) * 100) : null;
  let label: AdherenceLabel | null = null;
  if (logged.length) {
    if (onTargetDays / logged.length >= ADHERENCE_CONSISTENT_RATIO) label = "consistent";
    else if (averageKcalLogged! < calorieTarget - tolerance) label = "under";
    else label = "over";
  }

  return {
    loggedDays: logged.length,
    onTargetDays,
    adherencePct,
    label,
    averageKcalLogged,
    averageKcalFullWeek,
    totalKcal,
  };
}

/** Confidence downgrade rules for scan items. */
export function combineConfidence(
  modelConfidence: Confidence,
  warnings: string[],
  grounded: boolean,
): Confidence {
  let score = modelConfidence === "high" ? 3 : modelConfidence === "medium" ? 2 : 1;
  if (grounded) score = Math.min(3, score + 1);
  score -= warnings.length;
  if (score >= 3) return "high";
  if (score === 2) return "medium";
  return "low";
}

// ── Week rollups (shared by Trends) ───────────────────────────────────────
export interface DayKcal {
  date: string;
  kcal: number | null;
}

export function daysToKcal(entries: DiaryEntry[], dates: string[]): DayKcal[] {
  const byDate = new Map<string, number>();
  for (const e of entries) {
    const kcal = e.nutrients.kcal;
    if (typeof kcal === "number") byDate.set(e.entryDate, (byDate.get(e.entryDate) ?? 0) + kcal);
  }
  return dates.map((date) => ({ date, kcal: byDate.has(date) ? roundTo(byDate.get(date)!, 0) : null }));
}

export function goalMacroSplit(goals: GoalSet): { protein: number; carbs: number; fat: number } {
  const pk = goals.proteinG * 4;
  const ck = goals.carbsG * 4;
  const fk = goals.fatG * 9;
  const total = Math.max(pk + ck + fk, 1);
  return { protein: pk / total, carbs: ck / total, fat: fk / total };
}
