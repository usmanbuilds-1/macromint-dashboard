import { describe, expect, it } from "vitest";
import { savedMealEntryRows } from "./saved-meal-log";

describe("saved meal batch logging", () => {
  it("converts every food without losing nutrient nulls or 100% portions", () => {
    const rows = savedMealEntryRows([
      { foodId: "rice", name: "Rice", brand: null, grams: 150, per100g: { kcal: 130, protein: 2.7, fiber: null } },
      { foodId: null, name: "Daal", brand: null, grams: 200, per100g: { kcal: 110, protein: 6.2, sodium: 210 } },
    ], "person", "2026-11-06", "lunch");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      user_id: "person", entry_date: "2026-11-06", meal_type: "lunch",
      name: "Rice", food_id: "rice", source: "favorite", portion_percent: 100,
      base_nutrients: { kcal: 195, protein: 4.1, fiber: null },
    });
    expect(rows[0]?.nutrients.fiber).toBeNull();
    expect(rows[1]?.base_nutrients).toEqual({ kcal: 220, protein: 12.4, sodium: 420 });
  });

  it("does not manufacture items for empty saved meals", () => {
    expect(savedMealEntryRows([], "person", "2026-11-06", "dinner")).toEqual([]);
  });
});
