import { describe, expect, it } from "vitest";
import { summarizeNutrientCoverage, hasCompleteNutrientData } from "./coverage";

const base = (nutrients: Record<string, number | null>, grams = 100) => ({
  nutrients, grams, portionPercent: 100,
});

describe("nutrient coverage is not a claim of nutritional accuracy", () => {
  it("counts genuine zero as known, not missing", () => {
    const result = summarizeNutrientCoverage([base({ protein: 0 })], "protein");
    expect(result.status).toBe("complete");
    expect(result.knownAmount).toBe(0);
    expect(result.completeDayAmount).toBe(0);
    expect(result.entryCoverage).toBe(1);
  });
  it("never turns missing micronutrients into complete zero-day totals", () => {
    const result = summarizeNutrientCoverage([base({ iron: null }), base({ kcal: 300 })], "iron");
    expect(result.status).toBe("unavailable");
    expect(result.knownAmount).toBeNull();
    expect(result.completeDayAmount).toBeNull();
    expect(result.entryCoverage).toBe(0);
  });
  it("labels partial sums as incomplete, regardless of missing mass", () => {
    const result = summarizeNutrientCoverage([
      base({ fiber: 4 }, 100),
      base({ fiber: null }, 300),
      base({ fiber: 0 }, 100),
    ], "fiber");
    expect(result.status).toBe("partial");
    expect(result.knownAmount).toBe(4);
    expect(result.completeDayAmount).toBeNull();
    expect(result.entryCoverage).toBeCloseTo(2 / 3);
    expect(result.massCoverage).toBeCloseTo(.4);
    expect(hasCompleteNutrientData([base({ fiber: 4 }),base({ fiber: null })], "fiber")).toBe(false);
  });
  it("shows sums only when every logged entry has nutrient data", () => {
    const entries = [base({ vitaminC: 10.2 }), base({ vitaminC: 3.1 })];
    const r = summarizeNutrientCoverage(entries, "vitaminC");
    expect(r.status).toBe("complete");
    expect(r.completeDayAmount).toBeCloseTo(13.3);
    expect(r.missingEntries).toBe(0);
  });
  it("rejects negative, NaN and Infinity nutrient values as unknown", () => {
    const r = summarizeNutrientCoverage([
      base({ iron: -4 }),base({ iron: NaN }),base({ iron: Infinity }),
    ],"iron");
    expect(r.status).toBe("unavailable");
    expect(r.knownAmount).toBeNull();
  });
  it("does not assert an empty diary represents zero nutrient intake", () => {
    const r = summarizeNutrientCoverage([],"vitaminC");
    expect(r.status).toBe("unavailable");
    expect(r.completeDayAmount).toBeNull();
  });
  it("treats invalid masses as unavailable for mass coverage", () => {
    const r = summarizeNutrientCoverage([base({ iron: 1 },0)],"iron");
    expect(r.massCoverage).toBeNull();
    expect(r.entryCoverage).toBe(1);
  });
});
