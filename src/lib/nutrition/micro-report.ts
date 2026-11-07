import type { DiaryEntry, MicronutrientKey } from "@/types";
import { MICRONUTRIENT_KEYS } from "@/types";

export type NutrientContribution = { entryId: string; food: string; value: number };
export type MicroReport = {
  key: MicronutrientKey;
  knownTotal: number | null;
  knownEntries: number;
  missingEntries: number;
  complete: boolean;
  contributors: NutrientContribution[];
};

/** Use a single already fetched diary range. Missing != zero, even if other
 * foods in the same day include that nutrient. No demographic-based RDA. */
export function microReport(entries: readonly DiaryEntry[], key: MicronutrientKey): MicroReport {
  if (!MICRONUTRIENT_KEYS.includes(key)) throw new RangeError("Unknown micronutrient");
  let total = 0;
  let knownEntries = 0;
  const contributors: NutrientContribution[] = [];
  for (const entry of entries) {
    const v = entry.nutrients[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) continue;
    knownEntries++;
    total += v;
    if (v > 0) contributors.push({ entryId: entry.id, food: entry.name, value: v });
  }
  contributors.sort((a, b) => b.value - a.value);
  return {
    key,
    knownTotal: knownEntries ? Math.round(total * 100) / 100 : null,
    knownEntries,
    missingEntries: entries.length - knownEntries,
    complete: entries.length > 0 && knownEntries === entries.length,
    contributors: contributors.slice(0, 5),
  };
}
