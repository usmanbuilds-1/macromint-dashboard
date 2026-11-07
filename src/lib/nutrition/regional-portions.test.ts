import { describe, expect, it } from "vitest";
import { regionalPortions } from "./regional-portions";
describe("approximate kitchen portions", () => {
  it("offers editable context-specific weights, not a universal cup", () => {
    expect(regionalPortions("Whole wheat chapati")[0]?.grams).toBe(40);
    expect(regionalPortions("Cooked biryani")[0]?.grams).toBe(160);
    expect(regionalPortions("Banana")).toEqual([]);
  });
  it("marks every approximation as approximate", () => {
    for (const name of ["Daal", "Chapati", "Chai", "Ghee"]) {
      expect(regionalPortions(name).every((unit) => /approximate/i.test(unit.note))).toBe(true);
    }
  });
});
