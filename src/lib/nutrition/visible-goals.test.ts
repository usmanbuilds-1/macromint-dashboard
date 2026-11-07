import { describe, expect, it } from "vitest";
import type { GoalSet } from "@/types";
import { visibleDailyGoals } from "./visible-goals";

const goals = { userId: "u", calorieTarget: 2000, proteinG: 100,
  carbsG: 220, fatG: 67, fiberG: 28, waterMl: 2500,
  method: "placeholder", manuallyAdjusted: false } as GoalSet;

describe("visible daily nutrition goals", () => {
  it("never presents seeded placeholder values as a personal target", () => {
    expect(visibleDailyGoals(goals)).toBeNull();
    expect(visibleDailyGoals(null)).toBeNull();
  });
  it("preserves explicitly calculated or manually chosen targets", () => {
    const actual = { ...goals, method: "manual" } as GoalSet;
    expect(visibleDailyGoals(actual)).toEqual(actual);
  });
});
