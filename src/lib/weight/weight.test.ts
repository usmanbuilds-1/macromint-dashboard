import { describe, expect, it } from "vitest";
import { calculateAdultBmi, estimateAdultEnergy } from "./energy";
import {
  evaluateWeightTrend,
  MIN_LOGGED_DAYS,
  PLATEAU_HEURISTIC_PCT_PER_WEEK,
} from "./trends";

const asOf = "2026-11-03";
function daysBefore(days: number): string {
  return new Date(Date.UTC(2026, 10, 3 - days)).toISOString().slice(0, 10);
}
function entries(fn: (day: number) => number, count = 28) {
  return Array.from({ length: count }, (_, index) => {
    const age = count - 1 - index;
    return { entryDate: daysBefore(age), weightKg: fn(index) };
  });
}
describe("adult BMI screening", () => {
  it("computes kg per square metre without affecting calorie calculations", () => {
    expect(calculateAdultBmi(80, 180)).toMatchObject({
      value: 24.69, category: "healthy_range", interpretation: "adult_screening_only",
    });
  });
  it("uses standard adult categories at each boundary", () => {
    const kgAt = (bmi: number) => bmi * 1.8 * 1.8;
    expect(calculateAdultBmi(kgAt(18.49), 180).category).toBe("underweight");
    expect(calculateAdultBmi(kgAt(18.5), 180).category).toBe("healthy_range");
    expect(calculateAdultBmi(kgAt(25), 180).category).toBe("overweight");
    expect(calculateAdultBmi(kgAt(30), 180).category).toBe("obesity_class_1");
    expect(calculateAdultBmi(kgAt(35), 180).category).toBe("obesity_class_2");
    expect(calculateAdultBmi(kgAt(40), 180).category).toBe("obesity_class_3");
  });
  it("rejects invalid measurements", () => {
    expect(() => calculateAdultBmi(0, 180)).toThrow(RangeError);
    expect(() => calculateAdultBmi(70, Number.NaN)).toThrow(RangeError);
  });
});
describe("energy estimate uses Mifflin–St Jeor, not a BMI-to-calorie mapping", () => {
  const input = {
    ageYears: 30, sex: "male" as const, heightCm: 180, weightKg: 80,
    activityLevel: "moderate" as const, objective: "maintain" as const,
  };
  it("shows resting and maintenance energy separately", () => {
    const result = estimateAdultEnergy(input);
    expect(result.bmrKcal).toBe(1780);
    expect(result.maintenanceKcal).toBe(2759);
    expect(result.suggestedTargetKcal).toBe(2759);
    expect(result.activityFactor).toBe(1.55);
    expect(result.sourceMethod).toBe("mifflin_st_jeor_1990");
  });
  it("provides transparent goal surplus/deficit as a starting assumption", () => {
    expect(estimateAdultEnergy({ ...input, objective: "gain" }).suggestedTargetKcal).toBe(3109);
    expect(estimateAdultEnergy({ ...input, objective: "lose" }).suggestedTargetKcal).toBe(2259);
  });
  it("does not generate automatic weight-loss targets for underweight adults", () => {
    const result = estimateAdultEnergy({ ...input, weightKg: 50, objective: "lose" });
    expect(result.bmi.category).toBe("underweight");
    expect(result.suggestedTargetKcal).toBeNull();
    expect(result.canAutoSuggest).toBe(false);
  });
  it("rejects paediatric ages and invalid activity values rather than silently predicting", () => {
    expect(() => estimateAdultEnergy({ ...input, ageYears: 19 })).toThrow(RangeError);
    expect(() => estimateAdultEnergy({ ...input, activityLevel: "unknown" as never })).toThrow(RangeError);
  });
});
describe("four-week weight trend", () => {
  it("does not trigger from three days of identical weight", () => {
    const result = evaluateWeightTrend(entries(() => 80, 3), "lose", asOf);
    expect(result.status).toBe("insufficient_data");
    expect(result.loggedDays).toBe(3);
  });
  it("detects a possible plateau only after dense 28-day observations", () => {
    const result = evaluateWeightTrend(entries(() => 80), "lose", asOf);
    expect(result.status).toBe("possible_plateau");
    expect(result.loggedDays).toBe(28);
    expect(result.weeklyTrendPct).toBe(0);
    expect(result.thresholdPctPerWeek).toBe(PLATEAU_HEURISTIC_PCT_PER_WEEK);
  });
  it("does not call stable maintenance or body recomposition a problematic plateau", () => {
    expect(evaluateWeightTrend(entries(() => 80), "maintain", asOf).status).toBe("maintenance_stable");
    expect(evaluateWeightTrend(entries(() => 80), "recomp", asOf).status).toBe("maintenance_stable");
  });
  it("recognises sustained loss and gain rather than classifying them as stalled", () => {
    expect(evaluateWeightTrend(entries(i => 80 - .07 * i), "lose", asOf).status).toBe("on_track");
    expect(evaluateWeightTrend(entries(i => 80 + .07 * i), "gain", asOf).status).toBe("on_track");
    expect(evaluateWeightTrend(entries(i => 80 - .07 * i), "gain", asOf).status).toBe("opposite_direction");
  });
  it("ignores impossible and future records and duplicate dates count once", () => {
    const all = [
      ...entries(() => 80),
      { entryDate: asOf, weightKg: 999 },
      { entryDate: asOf, weightKg: 80 },
      { entryDate: "2026-11-04", weightKg: 80 },
      { entryDate: "2026-02-30", weightKg: 80 },
    ];
    const result = evaluateWeightTrend(all, "lose", asOf);
    expect(result.loggedDays).toBe(28);
    expect(result.status).toBe("possible_plateau");
  });
  it("requires adequate coverage through all four weeks, not only a busy last week", () => {
    const denseButGappy = entries(() => 80).filter((_, i) => i >= 7);
    expect(denseButGappy.length).toBeGreaterThan(MIN_LOGGED_DAYS);
    expect(evaluateWeightTrend(denseButGappy, "lose", asOf).status).toBe("insufficient_data");
  });
  it("refuses a plateau verdict when readings are old", () => {
    const oldEntries = entries(() => 80).filter((_, i) => i < 24);
    expect(evaluateWeightTrend(oldEntries, "lose", asOf).status).toBe("insufficient_data");
  });
  it("uses robust pairwise trends rather than a single extreme endpoint", () => {
    const all = entries(() => 80);
    all[0]!.weightKg = 83;
    const result = evaluateWeightTrend(all, "lose", asOf);
    expect(result.weeklyTrendKg === null || Math.abs(result.weeklyTrendKg) < .2).toBe(true);
  });
});
