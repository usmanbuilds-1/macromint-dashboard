import type { DiaryEntry, NutrientKey } from "@/types";

/**
 * Metadata for deciding whether a diary nutrient value can be displayed
 * without pretending missing values are known zero.
 *
 * Coverage measures data *availability*, NOT chemical accuracy, external
 * database verification, or user portion accuracy.
 */
export interface NutrientCoverage {
  nutrient: NutrientKey;
  status: "complete" | "partial" | "unavailable";
  knownAmount: number | null;
  /** Null unless the whole day's food data has this nutrient. */
  completeDayAmount: number | null;
  knownEntries: number;
  missingEntries: number;
  loggedEntries: number;
  /** Fraction of eligible logged food entries with a finite nonnegative value. */
  entryCoverage: number;
  /** Only meaningful when food portions have valid positive weights. */
  massCoverage: number | null;
}

/**
 * Honest nutrition data summary; a partial sum is a *lower bound of
 * reported values*, not the actual total or a nutrient deficiency verdict.
 *
 * Example: a teaspoon of oil has 0g protein, which counts as KNOWN zero;
 * an omitted protein value is UNKNOWN and does not count as zero.
 */
export function summarizeNutrientCoverage(
  entries: readonly Pick<DiaryEntry, "nutrients" | "grams" | "portionPercent">[],
  nutrient: NutrientKey,
): NutrientCoverage {
  let total = 0;
  let knownEntries = 0;
  let knownMass = 0;
  let totalMass = 0;
  let allMassValid = true;

  for (const e of entries) {
    const value = e.nutrients[nutrient];
    const known = typeof value === "number" && Number.isFinite(value) && value >= 0;
    if (known) {
      total += value;
      knownEntries++;
    }
    const mass = (e.grams * e.portionPercent) / 100;
    if (Number.isFinite(mass) && mass > 0) {
      totalMass += mass;
      if (known) knownMass += mass;
    } else {
      allMassValid = false;
    }
  }

  const loggedEntries = entries.length;
  const missingEntries = loggedEntries - knownEntries;
  const status: NutrientCoverage["status"] = knownEntries === 0
    ? "unavailable"
    : missingEntries === 0
      ? "complete"
      : "partial";

  // Do not round measurement sums here. UI rounding belongs at the point of display.
  // For empty diaries, 0 is not a known zero intake: it is unobserved.
  const knownAmount = knownEntries === 0 ? null : total;
  return {
    nutrient,
    status,
    knownAmount,
    completeDayAmount: status === "complete" && loggedEntries > 0 ? total : null,
    knownEntries,
    missingEntries,
    loggedEntries,
    entryCoverage: loggedEntries ? knownEntries / loggedEntries : 0,
    massCoverage: allMassValid && totalMass > 0 ? knownMass / totalMass : null,
  };
}

/** UI gate for a complete day total, not proof of nutrient accuracy. */
export function hasCompleteNutrientData(
  entries: readonly Pick<DiaryEntry, "nutrients" | "grams" | "portionPercent">[],
  nutrient: NutrientKey,
): boolean {
  return summarizeNutrientCoverage(entries, nutrient).status === "complete";
}
