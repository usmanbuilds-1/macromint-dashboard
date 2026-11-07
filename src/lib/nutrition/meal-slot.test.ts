import { describe, expect, it } from "vitest";
import { suggestedMealAtHour } from "./meal-slot";

describe("local meal defaults", () => {
  it("covers all four local meal windows", () => {
    for (const [hour, slot] of [[0,"breakfast"],[10,"breakfast"],[11,"lunch"],[14,"lunch"],[15,"dinner"],[20,"dinner"],[21,"snacks"],[23,"snacks"]] as const) {
      expect(suggestedMealAtHour(hour)).toBe(slot);
    }
  });
  it("rejects impossible clock values", () => {
    expect(() => suggestedMealAtHour(-1)).toThrow(RangeError);
    expect(() => suggestedMealAtHour(24)).toThrow(RangeError);
  });
});
