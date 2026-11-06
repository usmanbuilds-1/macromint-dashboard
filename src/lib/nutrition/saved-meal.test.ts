import { describe, expect, it } from "vitest";
import { toSavedMealItem } from "./saved-meal";
import { savedMealEntryRows } from "@/lib/backend/supabase/saved-meal-log";
import { applyPortionPercent, scaleNutrients } from "./math";

const entry = (portionPercent: number) => ({
  foodId: "biryani",
  name: "Chicken biryani",
  brand: null,
  grams: 500,
  portionPercent,
  baseNutrients: { kcal: 850, protein: 35, carbs: 120, fat: 28, fiber: null },
});

describe("saved meal portion integrity", () => {
  it("saves and re-logs the amount actually eaten, not the original full plate", () => {
    const original = entry(70);
    const item = toSavedMealItem(original);
    expect(item.grams).toBe(350);
    const [row] = savedMealEntryRows([item], "person", "2026-11-07", "dinner");
    expect(row?.nutrients.kcal).toBe(applyPortionPercent(original.baseNutrients, 70).kcal);
    expect(row?.nutrients.protein).toBeCloseTo(24.5, 1);
    expect(row?.nutrients.fiber).toBeNull();
  });

  it("leaves full portions unchanged and avoids double multiplication", () => {
    const item = toSavedMealItem(entry(100));
    expect(item.grams).toBe(500);
    const [row] = savedMealEntryRows([item], "person", "2026-11-07", "dinner");
    expect(row?.nutrients.kcal).toBe(850);
  });

  it("replayed meals should never exceed the original logged portion for small fractions", () => {
    for (const pct of [25, 50, 75, 100]) {
      const original = entry(pct);
      const [row] = savedMealEntryRows([toSavedMealItem(original)], "person", "2026-11-07", "dinner");
      const expected = applyPortionPercent(original.baseNutrients, pct);
      expect(Math.abs((row?.nutrients.kcal ?? 0) - (expected.kcal ?? 0))).toBeLessThanOrEqual(1);
      expect(Math.abs((row?.nutrients.protein ?? 0) - (expected.protein ?? 0))).toBeLessThanOrEqual(0.2);
    }
  });

  it("retains fractional source calories even for larger irregular gram weights", () => {
    const original = { ...entry(70), grams: 731, baseNutrients: { kcal: 1277, protein: 36.7, carbs: 140.3, fat: 25.6 } };
    const item = toSavedMealItem(original);
    const [row] = savedMealEntryRows([item], "person", "2026-11-07", "dinner");
    expect(item.grams).toBeCloseTo(511.7, 6);
    // Storage rounds energy to whole kcal, so the exact 893.9 becomes 894.
    expect(row?.nutrients.kcal).toBe(894);
    expect(row?.nutrients.protein).toBeCloseTo(25.7, 1);
  });

  it("rejects invalid gram amounts and percentages", () => {
    expect(() => toSavedMealItem(entry(0))).toThrow(RangeError);
    expect(() => toSavedMealItem(entry(101))).toThrow(RangeError);
    expect(() => toSavedMealItem({ ...entry(50), grams: 0 })).toThrow(RangeError);
  });

  it("retains nulls and scales directly from the baseline", () => {
    const item = toSavedMealItem(entry(70));
    expect(item.per100g.fiber).toBeNull();
    expect(scaleNutrients(item.per100g, item.grams).kcal).toBe(595);
  });
});
