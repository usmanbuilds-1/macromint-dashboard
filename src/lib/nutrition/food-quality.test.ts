import { describe, expect, it } from "vitest";
import { foodQuality, loggableFoodQuality } from "./food-quality";

describe("food provenance and completeness", () => {
  it("distinguishes unverified from missing values", () => {
    const result = foodQuality({ source: "off", verified: true, per100g: { kcal: 140, protein: 5, carbs: null, fat: 3, iron: 0 } });
    expect(result.verification).toBe("source-verified");
    expect(result.macrosKnown).toBe(3);
    expect(result.microsKnown).toBe(1);
    expect(result.missingEssential).toEqual(["carbs"]);
    expect(result.warning).toMatch(/unavailable/);
  });
  it("preserves zero as a known quantity, not missing", () => {
    const result = loggableFoodQuality({ per100g: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, verified: false, sourceLabel: "Quick add" });
    expect(result.provenance).toBe("user-entered");
    expect(result.macrosKnown).toBe(4);
    expect(result.microsKnown).toBe(0);
  });
});
