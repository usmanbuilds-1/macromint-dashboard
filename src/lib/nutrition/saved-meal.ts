import type { DiaryEntry, SavedMealItem } from "@/types";
import type { NutrientKey, NutrientRecord } from "@/types";

/** A saved meal represents what was eaten, not the uneaten full plate.
 * Legacy saved meal rows already contain effective grams and remain valid. */
export function toSavedMealItem(entry: Pick<DiaryEntry, "foodId" | "name" | "brand" | "grams" | "portionPercent" | "baseNutrients">): SavedMealItem {
  if (!Number.isFinite(entry.grams) || entry.grams <= 0 ||
      !Number.isFinite(entry.portionPercent) || entry.portionPercent <= 0 || entry.portionPercent > 100) {
    throw new RangeError("Invalid source entry portion");
  }
  const eatenGrams = entry.grams * entry.portionPercent / 100;
  // Keep precision until final storage; do not round the derived per-100g profile.
  const per100g: NutrientRecord = {};
  for (const [key, value] of Object.entries(entry.baseNutrients) as [NutrientKey, number | null][]) {
    per100g[key] = value == null ? null : value * 100 / entry.grams;
  }
  return {
    foodId: entry.foodId,
    name: entry.name,
    brand: entry.brand,
    grams: eatenGrams,
    per100g,
  };
}
