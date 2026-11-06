import { getSupabase } from "@/lib/supabase";
import { applyPortionPercent } from "@/lib/nutrition/math";
import type { MealType, NutrientRecord, SavedMeal } from "@/types";
import { BackendError } from "../types";

/** Preserve the existing saved-meal nutrient rounding exactly. */
function scaleToBase(per100g: NutrientRecord, grams: number): NutrientRecord {
  const factor = grams / 100;
  const out: NutrientRecord = {};
  for (const [key, value] of Object.entries(per100g) as [string, number | null][]) {
    out[key as keyof NutrientRecord] = value == null ? null : Math.round(value * factor * 10) / 10;
  }
  return out;
}

export function savedMealEntryRows(
  items: SavedMeal["items"], userId: string, entryDate: string, mealType: MealType,
) {
  return items.map((item) => {
    const base = applyPortionPercent(scaleToBase(item.per100g, item.grams), 100);
    return {
      user_id: userId,
      entry_date: entryDate,
      meal_type: mealType,
      food_id: item.foodId,
      recipe_id: null,
      name: item.name,
      brand: item.brand,
      grams: item.grams,
      portion_percent: 100,
      base_nutrients: base,
      nutrients: applyPortionPercent(base, 100),
      source: "favorite" as const,
    };
  });
}

/** Two RLS-protected database requests regardless of how many foods are saved.
 * Single INSERT is atomic; failed requests cannot leave a partially logged meal.
 */
export async function logSavedMealBatch(
  savedMealId: string, entryDate: string, mealType: MealType, userId: string,
): Promise<void> {
  const sb = getSupabase();
  const { data: meal, error: findError } = await sb
    .from("saved_meals").select("items").eq("id", savedMealId).maybeSingle();
  if (findError) throw new BackendError("DB", findError.message);
  if (!meal) throw new BackendError("NOT_FOUND", "Saved meal not found");
  const items = meal.items as unknown as SavedMeal["items"];
  if (!Array.isArray(items)) throw new BackendError("DB", "Saved meal data is invalid");
  const rows = savedMealEntryRows(items, userId, entryDate, mealType);
  if (rows.length === 0) return;
  const { error } = await sb.from("diary_entries").insert(rows);
  if (error?.code === "42501") throw new BackendError("NO_ACCESS", "Active access required");
  if (error) throw new BackendError("DB", error.message);
}
