import { describe, expect, it } from "vitest";
import { buildWeeklyHistory } from "./WeeklyArchive";
import { lastNWeeks } from "@/lib/nutrition/datetime";
import { daysToKcal, adherenceStats } from "@/lib/nutrition/math";
import type { DiaryEntry } from "@/types";

const today = "2026-11-06";
const weeks = lastNWeeks(today, 4);
const makeEntry = (date: string, kcal: number): DiaryEntry => ({
  id: date + String(kcal), userId: "person", entryDate: date,
  mealType: "lunch", foodId: null, recipeId: null, name: "Meal",
  brand: null, grams: 100, portionPercent: 100,
  baseNutrients: { kcal, protein: 20, carbs: 20, fat: 10 },
  nutrients: { kcal, protein: 20, carbs: 20, fat: 10 },
  source: "custom", loggedAt: date + "T12:00:00Z",
});

describe("Progress archive without N+1 requests", () => {
  it("reproduces the per-week baseline from a single date range", () => {
    const entries = [
      makeEntry(weeks[0]![0]!, 1800),
      makeEntry(weeks[1]![2]!, 2000),
      makeEntry(weeks[1]![2]!, 400),
      makeEntry(weeks[2]![5]!, 2200),
      makeEntry(today, 2050),
    ];
    const result = buildWeeklyHistory(weeks, entries, 2000);
    const baseline = weeks.map((dates) =>
      adherenceStats(daysToKcal(entries.filter((e) => dates.includes(e.entryDate)), dates), 2000));
    expect(result.map((week) => week.stats)).toEqual(baseline);
    expect(result.map((week) => week.dates)).toEqual(weeks);
  });

  it("shows no recorded days for a new account", () => {
    const result = buildWeeklyHistory(weeks, [], 2000);
    expect(result).toHaveLength(4);
    expect(result.every((week) => week.stats.loggedDays === 0)).toBe(true);
  });
});
