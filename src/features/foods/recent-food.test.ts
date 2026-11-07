import { describe, expect, it } from "vitest";
import type { DiaryEntry } from "@/types";
import { recentEntryToLoggable, uniqueRecentFoods } from "./recent-food";

const entry = (name: string, brand: string | null = null) => ({
  id: name, name, brand, grams: 200, portionPercent: 50,
  foodId: null, baseNutrients: { kcal: 300, protein: null, carbs: 20 }, loggedAt: "2026-11-07T00:00:00Z",
}) as DiaryEntry;

describe("actual recently logged foods", () => {
  it("keeps portion and missing nutrient values truthful", () => {
    const food = recentEntryToLoggable(entry("Chapati"));
    expect(food.servingGrams).toBe(100);
    expect(food.per100g.kcal).toBe(150);
    expect(food.per100g.protein).toBeNull();
    expect(food.sourceLabel).toBe("Previously logged");
  });
  it("deduplicates food and brand without inventing items", () => {
    const rows = uniqueRecentFoods([entry("Chapati"), entry(" chapati "), entry("Chapati", "Other"), entry("Daal")], 3);
    expect(rows.map((row) => row.brand)).toEqual([null, "Other", null]);
    expect(uniqueRecentFoods([])).toEqual([]);
  });
});
