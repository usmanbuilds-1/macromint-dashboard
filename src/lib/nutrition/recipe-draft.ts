import type { NutrientRecord } from "@/types";
import type { RecipeInput } from "@/lib/backend/types";
import { scaleNutrients, sumNutrients } from "@/lib/nutrition/math";

export type RecipeDraftIngredient = RecipeInput["ingredients"][number] & { key: string };
export type RecipeDraft = { name: string; servings: number; notes: string; ingredients: RecipeDraftIngredient[] };

export function validateRecipeDraft(draft: RecipeDraft): string | null {
  if (!draft.name.trim() || draft.name.trim().length > 100) return "Enter a recipe name (up to 100 characters).";
  if (!Number.isInteger(draft.servings) || draft.servings < 1 || draft.servings > 50) return "Servings must be a whole number between 1 and 50.";
  if (draft.notes.length > 2000) return "Recipe notes must stay under 2000 characters.";
  if (!draft.ingredients.length || draft.ingredients.length > 30) return "Add 1 to 30 ingredients.";
  for (const item of draft.ingredients) {
    if (!item.name.trim() || item.name.length > 160) return "Every ingredient needs a name under 160 characters.";
    if (!Number.isFinite(item.grams) || item.grams < 0.1 || item.grams > 10000) return "Ingredient amounts must be 0.1 to 10000 grams.";
    for (const amount of Object.values(item.per100g)) {
      if (amount !== null && (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0))
        return "Ingredient nutrients cannot contain invalid or negative amounts.";
    }
  }
  return null;
}

export function recipeDraftNutrition(draft: RecipeDraft) {
  const profile: NutrientRecord = sumNutrients(draft.ingredients.map((ingredient) =>
    scaleNutrients(ingredient.per100g, ingredient.grams),
  ));
  const kcalKnown = draft.ingredients.filter((ingredient) => typeof ingredient.per100g.kcal === "number" &&
    Number.isFinite(ingredient.per100g.kcal)).length;
  return {
    knownEnergy: kcalKnown ? profile.kcal ?? null : null,
    completeEnergy: kcalKnown === draft.ingredients.length && kcalKnown > 0,
    kcalKnownIngredients: kcalKnown,
    perServingKnownEnergy: kcalKnown && draft.servings > 0 ? Math.round((profile.kcal ?? 0) / draft.servings) : null,
  };
}
