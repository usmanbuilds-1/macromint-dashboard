import { describe, expect, it } from "vitest";
import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg } from "./body";

describe("Onboarding imperial units use metric storage", () => {
  it("converts exactly 6 ft to 182.88 cm", () => {
    expect(feetInchesToCm("6", "0")).toBe(182.88);
    expect(cmToFeetInches(182.88)).toEqual({ feet: "6", inches: "0" });
  });

  it("converts 5 ft 11 in to 180.34 cm", () => {
    expect(feetInchesToCm("5", "11")).toBe(180.34);
    expect(cmToFeetInches(180.34)).toEqual({ feet: "5", inches: "11" });
  });

  it("rounds imperial display without altering stored metric input", () => {
    const metricCm = 176.7;
    const display = cmToFeetInches(metricCm);
    expect(Math.abs(feetInchesToCm(display.feet, display.inches)! - metricCm))
      .toBeLessThanOrEqual(0.127);
    expect(metricCm).toBe(176.7);
  });

  it("converts pounds to kilograms and back", () => {
    expect(lbToKg("220.462")).toBeCloseTo(100, 2);
    expect(kgToLb(100)).toBe("220.5");
    expect(lbToKg("")).toBeNull();
  });

  it("rejects invalid partial and out-of-range height entries", () => {
    expect(feetInchesToCm("", "5")).toBeNull();
    expect(feetInchesToCm("5", "")).toBeNull();
    expect(feetInchesToCm("5", "12")).toBeNull();
    expect(feetInchesToCm("5.5", "6")).toBeNull();
    expect(feetInchesToCm("-1", "9")).toBeNull();
    expect(lbToKg("NaN")).toBeNull();
    expect(cmToFeetInches(NaN)).toEqual({ feet: "", inches: "" });
  });
});
