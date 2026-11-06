import type { DiaryEntry, SavedMealItem } from "@/types";
import { scaleNutrients } from "./math";

/** A saved meal represents what was eaten, not the uneaten full plate.
 * Legacy saved meal rows already contain effective grams and remain valid. */
export function toSavedMealItem(entry: Pick<DiaryEntry, "foodId" | "name" | "brand" | "grams" | "portionPercent" | "baseNutrients">): SavedMealItem {
  if (!Number.isFinite(entry.grams) || entry.grams <= 0 ||
      !Number.isFinite(entry.portionPercent) || entry.portionPercent <= 0 || entry.portionPercent > 100) {
    throw new RangeError("Invalid source entry portion");
  }
  const eatenGrams = entry.grams * entry.portionPercent / 100;
  return {
    foodId: entry.foodId,
    name: entry.name,
    brand: entry.brand,
    grams: eatenGrams,
    per100g: scaleNutrients(entry.baseNutrients, 10000 / entry.grams),
  };
}
