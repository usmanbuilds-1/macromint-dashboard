import { describe, expect, it } from "vitest";
import { diaryExportCsv, weightExportCsv } from "./csv";

describe("data export CSV", () => {
  it("includes genuine zero nutrient values without converting unknown to zero", () => {
    const result = diaryExportCsv({ diary: [
      {
        entry_date: "2026-11-04", meal_type: "breakfast", name: "Olive oil",
        grams: 4.5, portion_percent: 100, source: "search",
        nutrients: { kcal: 39.78, protein: 0, carbs: 0, fat: 4.5, fiber: null },
      },
      {
        entryDate: "2026-11-04", mealType: "dinner", name: "Unknown dish",
        grams: 200, portionPercent: 100, nutrients: { kcal: 460, protein: null },
      },
    ] });
    const lines = result.split("\r\n");
    expect(lines[1]).toContain('"Olive oil"');
    expect(lines[1]).toContain('"39.78","0","0","4.5",');
    expect(lines[1]).not.toContain('"null"');
    expect(lines[2]).toContain('"Unknown dish"');
    expect(lines[2]).toContain('"460",');
  });
  it("escapes commas, newlines, quote marks and spreadsheet formulas", () => {
    const result = diaryExportCsv({ diary: [{
      entry_date: "2026-11-04", meal_type: "lunch", name: '=HYPERLINK("evil", "click")',
      brand: "A, B\nCo", grams: 100, portion_percent: 100,
      nutrients: { kcal: 100 }, source: "custom",
    }] });
    expect(result).toContain('"\'=HYPERLINK(""evil"", ""click"")"');
    expect(result).toContain('"A, B\nCo"');
  });
  it("exports weights across both backend adapter field conventions", () => {
    const result = weightExportCsv({ weightEntries: [
      { entryDate: "2026-11-04", weightKg: 60.7, note: null },
      { entry_date: "2026-11-03", weight_kg: 60.5, note: "Morning" },
    ] });
    expect(result).toContain('"60.7"');
    expect(result).toContain('"60.5"');
    expect(result).toContain('"Morning"');
  });
  it("exports headers for genuinely empty records but rejects incomplete responses", () => {
    expect(diaryExportCsv({ diary: [] })).toContain('"Calories (kcal)"');
    expect(weightExportCsv({ weightEntries: [] })).toContain('"Weight (kg)"');
    expect(() => diaryExportCsv({ diary: null })).toThrow(/missing a valid diary/);
  });
});
