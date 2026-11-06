import { describe, expect, it } from "vitest";
import type { DiaryEntry, Favorite, Food } from "@/types";
import { favoriteCandidateFromEntry, matchingFavorite } from "./favorite-actions";

const imported = {
  foodId: null,
  name: "Whole wheat toast",
  brand: "Local",
  servingLabel: "1 slice",
  servingGrams: 30,
  per100g: { kcal: 250, protein: 9, carbs: 45, fat: 3, sodium: null },
};

const favorite = {
  id: "fav-1",
  userId: "test-user",
  foodId: "food-custom",
  createdAt: "2026-11-07",
  food: {
    id: "food-custom",
    ownerId: "test-user",
    name: imported.name,
    brand: imported.brand,
    category: "Imported estimate",
    source: "custom",
    verified: false,
    per100g: imported.per100g,
    servingLabel: imported.servingLabel,
    servingGrams: imported.servingGrams,
  },
} as Favorite & { food: Food };

describe("private favorites", () => {
  it("matches an imported food by private exact nutrient snapshot", () => {
    expect(matchingFavorite([favorite], imported)?.foodId).toBe("food-custom");
    expect(matchingFavorite([favorite], { ...imported, per100g: { kcal: 300 } })).toBeUndefined();
  });

  it("never treats a global food as an imported private favorite", () => {
    const globalFood = { ...favorite, food: { ...favorite.food, ownerId: null } };
    expect(matchingFavorite([globalFood], imported)).toBeUndefined();
  });

  it("uses the existing food ID for database favorites", () => {
    expect(matchingFavorite([favorite], { ...imported, foodId: "food-custom" })).toBeDefined();
  });

  it("takes only the eaten amount from a scanned diary entry", () => {
    const entry = {
      foodId: null, name: "Homemade meal", brand: null,
      grams: 500, portionPercent: 70,
      baseNutrients: { kcal: 850, protein: 35, carbs: null },
    } as unknown as DiaryEntry;
    const candidate = favoriteCandidateFromEntry(entry);
    expect(candidate.servingGrams).toBe(350);
    expect(candidate.per100g.kcal).toBe(170);
    expect(candidate.per100g.protein).toBe(7);
    expect(candidate.per100g.carbs).toBeNull();
  });
});
