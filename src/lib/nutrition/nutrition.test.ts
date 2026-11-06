import { describe, expect, it } from "vitest";
import {
  adherenceStats,
  applyPortionPercent,
  atwaterKcal,
  checkItemBounds,
  checkPlausibility,
  daysToKcal,
  scaleNutrients,
  rescaleScanNutrients,
  sumNutrients,
} from "./math";
import { computeGoals, mifflinStJeorBmr, tdee, sanitizeGoalEdit } from "./targets";
import { weekDates, weekLabel, lastNWeeks, addDaysStr, parseLocalDate } from "./datetime";
import type { DiaryEntry } from "@/types";

describe("Mifflin-St Jeor and TDEE", () => {
  it("computes BMR for a male reference case", () => {
    expect(mifflinStJeorBmr({ sex: "male", weightKg: 80, heightCm: 180, age: 30 })).toBe(1780);
  });
  it("computes BMR for a female reference case", () => {
    expect(mifflinStJeorBmr({ sex: "female", weightKg: 80, heightCm: 180, age: 30 })).toBe(1614);
  });
  it("scales BMR by the activity factor", () => {
    expect(tdee(1780, "sedentary")).toBe(2136);
    expect(tdee(1780, "moderate")).toBe(2759);
  });
});

describe("computeGoals", () => {
  it("derives transparent targets for a moderate male", () => {
    const { goals, breakdown } = computeGoals({
      sex: "male",
      age: 30,
      heightCm: 180,
      weightKg: 80,
      activityLevel: "moderate",
      objective: "maintain",
    });
    // BMR 1780, TDEE 2759, delta 0
    expect(goals.calorieTarget).toBe(2759);
    expect(goals.proteinG).toBe(128); // 1.6 × 80
    expect(goals.fatG).toBe(92); // 30% of 2759 / 9
    // carbs fill the remainder: (2759 − 128×4 − 92×9)/4 = 1419/4
    expect(goals.carbsG).toBe(355);
    expect(goals.fiberG).toBe(39); // 14 per 1000 kcal
    expect(goals.waterMl).toBe(2800);
    expect(breakdown.some((l) => l.label.startsWith("Safety floor"))).toBe(false);
  });

  it("applies the objective adjustment and safety floor", () => {
    const small = computeGoals({
      sex: "female",
      age: 45,
      heightCm: 150,
      weightKg: 45,
      activityLevel: "sedentary",
      objective: "lose",
    });
    // BMR = 450 + 937.5 − 225 − 161 ≈ 1002, TDEE 1202, −500 → 702 < 1200 floor
    expect(small.goals.calorieTarget).toBe(1200);
    expect(small.breakdown.some((l) => l.label.startsWith("Safety floor"))).toBe(true);

    const lose = computeGoals({
      sex: "male",
      age: 30,
      heightCm: 180,
      weightKg: 80,
      activityLevel: "moderate",
      objective: "lose",
    });
    expect(lose.goals.calorieTarget).toBe(2259);
  });

  it("rejects impossible manual edits", () => {
    expect(sanitizeGoalEdit({ calorieTarget: 100 })).toBeNull();
    expect(sanitizeGoalEdit({ calorieTarget: 2400, proteinG: 140, carbsG: 260, fatG: 80, fiberG: 30, waterMl: 2800 })).toMatchObject({ calorieTarget: 2400, manuallyAdjusted: true });
  });
});

describe("nutrient arithmetic", () => {
  const pastaPer100g = { kcal: 500, protein: 20, carbs: 50, fat: 15, sodium: null };

  it("scales per-100g values (the 500 kcal pasta, 70 g example)", () => {
    const scaled = scaleNutrients(pastaPer100g, 70);
    expect(scaled.kcal).toBe(350);
    expect(scaled.protein).toBe(14);
    expect(scaled.carbs).toBe(35);
    expect(scaled.fat).toBe(10.5);
  });

  it("applies a portion percentage on top of the logged quantity", () => {
    const base = scaleNutrients(pastaPer100g, 500);
    expect(base.kcal).toBe(2500);
    const eaten = applyPortionPercent(base, 70);
    expect(eaten.kcal).toBe(1750);
    expect(eaten.protein).toBe(70);
  });

  it("never converts unavailable (null) values into zeros", () => {
    expect(scaleNutrients(pastaPer100g, 70).sodium).toBeNull();
    expect(sumNutrients([{ kcal: 100, fiber: null }, { kcal: 50, fiber: 2 }])).toEqual({
      kcal: 150,
      fiber: 2,
    });
    expect(sumNutrients([{ kcal: null }, { kcal: null }]).kcal).toBeUndefined();
  });

  it("sums macros across many entries", () => {
    const total = sumNutrients([
      { kcal: 100.4, protein: 10, carbs: 5, fat: 2 },
      { kcal: 200.6, protein: 20, carbs: 10, fat: 4 },
    ]);
    expect(total.kcal).toBe(301);
    expect(total.protein).toBe(30);
  });
});

describe("scan portion corrections", () => {
  const original = {
    kcal: 200, protein: 12, carbs: 30, fat: 4, sodium: null, iron: 2.5, fiber: 3,
  };

  it("scales calories, macros and micronutrients from the original grams", () => {
    const increased = rescaleScanNutrients(original, 100, 150);
    expect(increased).toMatchObject({
      kcal: 300, protein: 18, carbs: 45, fat: 6, iron: 3.8, fiber: 4.5, sodium: null,
    });
    expect(rescaleScanNutrients(original, 100, 100)).toEqual(original);
  });

  it("does not accumulate drift across repeated portion edits", () => {
    const first = rescaleScanNutrients(original, 100, 150);
    expect(first.iron).toBe(3.8);
    expect(rescaleScanNutrients(original, 100, 100).iron).toBe(2.5);
  });

  it("keeps missing nutrients unknown while preserving measured zeros", () => {
    expect(rescaleScanNutrients({ kcal: 0, vitaminD: null }, 90, 180))
      .toEqual({ kcal: 0, vitaminD: null });
  });

  it("rejects blank, zero, infinite and invalid portions instead of saving them", () => {
    expect(() => rescaleScanNutrients(original, 100, 0)).toThrow(RangeError);
    expect(() => rescaleScanNutrients(original, 0, 100)).toThrow(RangeError);
    expect(() => rescaleScanNutrients(original, 100, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it("resizes each item independently in multi-food scans", () => {
    const other = { kcal: 80, protein: 1 };
    const one = rescaleScanNutrients(original, 100, 50);
    const two = rescaleScanNutrients(other, 200, 300);
    expect(one.kcal).toBe(100);
    expect(two.kcal).toBe(120);
  });
});

describe("Atwater plausibility checks", () => {
  it("accepts consistent records", () => {
    const rec = { kcal: 400, protein: 20, carbs: 50, fat: 15 };
    expect(atwaterKcal(rec)).toBe(415);
    expect(checkPlausibility(rec).ok).toBe(true);
  });
  it("flags energy that contradicts the macros", () => {
    const result = checkPlausibility({ kcal: 100, protein: 20, carbs: 50, fat: 15 });
    expect(result.ok).toBe(false);
    expect(result.issues[0]).toMatch(/Atwater/);
  });
  it("does not invent missing macros for an Atwater contradiction", () => {
    expect(checkPlausibility({ kcal: 420, protein: 15, carbs: null, fat: null }).ok).toBe(true);
  });
  it("flags impossible portion bounds", () => {
    expect(checkItemBounds(3000, 400).ok).toBe(false);
    expect(checkItemBounds(200, 2500).ok).toBe(false);
    expect(checkItemBounds(200, 400).ok).toBe(true);
  });
});

describe("adherence", () => {
  let dayCounter = 0;
  const mk = (kcal: number | null) => ({ date: `2099-01-0${(dayCounter = Math.min(dayCounter + 1, 7))}`, kcal });

  it("never scores bingeing as perfect adherence", () => {
    const days = [2500, 2600, 2400, 2550, 2450, 3000, 10000].map(mk);
    const stats = adherenceStats(days, 2000);
    expect(stats.loggedDays).toBe(7);
    expect(stats.onTargetDays).toBe(0);
    expect(stats.adherencePct).toBe(0);
    expect(stats.label).toBe("over");
  });

  it("labels consistent weeks correctly", () => {
    const days = [2000, 2050, 1980, 2100, 1950, 2600, 2400].map(mk); // 5/7 within ±200
    const stats = adherenceStats(days, 2000);
    expect(stats.onTargetDays).toBe(5);
    expect(stats.adherencePct).toBe(71);
    expect(stats.label).toBe("consistent");
    expect(stats.averageKcalLogged).toBe(2154);
    expect(stats.averageKcalFullWeek).toBe(2154);
  });

  it("labels under-eating and ignores empty days", () => {
    const days = [1200, 1100, 1300, null, null, null, null].map(mk);
    const stats = adherenceStats(days, 2000);
    expect(stats.loggedDays).toBe(3);
    expect(stats.adherencePct).toBe(0);
    expect(stats.label).toBe("under");
    expect(stats.averageKcalFullWeek).toBe(514);
  });

  it("returns null adherence for a completely empty week", () => {
    const stats = adherenceStats([null, null, null, null, null, null, null].map(mk), 2000);
    expect(stats.adherencePct).toBeNull();
    expect(stats.label).toBeNull();
  });
});

describe("week bucketing", () => {
  it("always returns exactly 7 local days, Monday to Sunday", () => {
    const week = weekDates("2026-01-01", 0); // Thursday
    expect(week).toHaveLength(7);
    expect(week[0]).toBe("2025-12-29");
    expect(week[6]).toBe("2026-01-04");
  });

  it("handles year, month and leap-year boundaries", () => {
    expect(weekDates("2026-01-01", -1)[0]).toBe("2025-12-22");
    expect(weekDates("2024-02-28", 0)).toEqual([
      "2024-02-26",
      "2024-02-27",
      "2024-02-28",
      "2024-02-29",
      "2024-03-01",
      "2024-03-02",
      "2024-03-03",
    ]);
  });

  it("produces previous weeks and labels", () => {
    const weeks = lastNWeeks("2026-01-05", 4);
    expect(weeks).toHaveLength(4);
    expect(weeks[3]![0]).toBe("2026-01-05"); // current week Monday
    expect(weeks[0]![0]).toBe("2025-12-15");
    expect(weekLabel(weeks[3]!)).toContain("Jan 5");
  });

  it("parses and shifts without timezone drift", () => {
    expect(addDaysStr("2026-03-01", 1)).toBe("2026-03-02");
    expect(parseLocalDate("2026-03-01").getDate()).toBe(1);
  });
});

describe("daysToKcal", () => {
  const entry = (date: string, kcal: number): DiaryEntry =>
    ({
      entryDate: date,
      nutrients: { kcal },
    }) as DiaryEntry;

  it("sums per day and leaves unlogged days null", () => {
    const days = daysToKcal(
      [entry("2026-01-01", 300), entry("2026-01-01", 200), entry("2026-01-02", 550)],
      ["2026-01-01", "2026-01-02", "2026-01-03"],
    );
    expect(days[0]!.kcal).toBe(500);
    expect(days[1]!.kcal).toBe(550);
    expect(days[2]!.kcal).toBeNull();
  });
});


describe("zero manual macro values", () => {
  const validGoals = {
    userId: "test-user",
    calorieTarget: 2000,
    proteinG: 0,
    carbsG: 200,
    fatG: 0,
    fiberG: 25,
    waterMl: 2000,
    method: "manual",
    manuallyAdjusted: true,
  };
  it("accepts zero protein and fat in manually edited totals", () => {
    const outcome = sanitizeGoalEdit(validGoals);
    expect(outcome).not.toBeNull();
    expect(outcome?.proteinG).toBe(0);
    expect(outcome?.fatG).toBe(0);
  });
  it("does not turn blank or negative protein/fat targets into zero", () => {
    expect(sanitizeGoalEdit({ ...validGoals, proteinG: "" as never })).toBeNull();
    expect(sanitizeGoalEdit({ ...validGoals, fatG: -1 })).toBeNull();
    expect(sanitizeGoalEdit({ ...validGoals, proteinG: "Infinity" as never })).toBeNull();
  });
});
