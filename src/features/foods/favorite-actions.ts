import type { DiaryEntry, Favorite, Food, NutrientKey, NutrientRecord } from "@/types";
import { backend } from "@/lib/backend";
import type { LoggableFood } from "./FoodLogProvider";

type FavoriteWithFood = Favorite & { food: Food };
export type FavoriteCandidate = Pick<LoggableFood, "foodId" | "name" | "brand" | "per100g" | "servingGrams" | "servingLabel">;

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("en");
}

export function matchingFavorite(favorites: FavoriteWithFood[], candidate: FavoriteCandidate) {
  if (candidate.foodId) return favorites.find((fav) => fav.foodId === candidate.foodId);
  // For a remotely sourced or AI-estimated food, match only a private custom
  // food with an identical nutrition snapshot, not an unrelated branded food.
  const profile = JSON.stringify(candidate.per100g);
  return favorites.find((fav) =>
    fav.food.ownerId !== null &&
    normalized(fav.food.name) === normalized(candidate.name) &&
    normalized(fav.food.brand) === normalized(candidate.brand) &&
    JSON.stringify(fav.food.per100g) === profile
  );
}

/** Convert an AI-only or quick diary entry into a private reusable food.
 * The default serving repeats the amount EATEN; nutrition is from the
 * unscaled baseline, so the original percentage is not applied twice. */
export function favoriteCandidateFromEntry(entry: DiaryEntry): FavoriteCandidate {
  const per100g: NutrientRecord = {};
  const factor = 100 / Math.max(entry.grams, 1);
  for (const [key, value] of Object.entries(entry.baseNutrients) as [NutrientKey, number | null][]) {
    per100g[key] = value == null ? null : value * factor;
  }
  const eatenGrams = entry.grams * entry.portionPercent / 100;
  return {
    foodId: entry.foodId,
    name: entry.name,
    brand: entry.brand,
    per100g,
    servingLabel: "Previously eaten portion",
    servingGrams: eatenGrams,
  };
}

/** A remote/AI item is imported to this user's private food library before
 * adding a favorite. No global catalog writes, and never pretend it is
 * verified just because it was saved. */
export async function toggleFavoriteCandidate(
  candidate: FavoriteCandidate,
  favorites?: FavoriteWithFood[],
): Promise<boolean> {
  const existingFavorites = favorites ?? await backend.getFavorites();
  const existing = matchingFavorite(existingFavorites, candidate);
  if (existing) return backend.toggleFavorite(existing.foodId);
  let foodId = candidate.foodId;
  if (!foodId) {
    const created = await backend.createCustomFood({
      name: candidate.name.trim().slice(0, 120),
      brand: candidate.brand?.trim().slice(0, 120) || null,
      category: "Imported estimate",
      per100g: candidate.per100g,
      servingLabel: candidate.servingLabel,
      servingGrams: candidate.servingGrams,
    });
    foodId = created.id;
  }
  return backend.toggleFavorite(foodId);
}
