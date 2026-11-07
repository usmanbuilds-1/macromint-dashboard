import { describe, expect, it } from "vitest";
import type { DiaryEntry } from "@/types";
import { weeklyInsights } from "./weekly-insights";
const e = (date: string, name: string, kcal: number | null) => ({ entryDate: date, name, nutrients: { kcal } } as DiaryEntry);
describe("non-fabricated weekly signals", () => {
  it("excludes missing days and incomplete energy days from averages", () => {
    const report = weeklyInsights([e("2026-11-06","Roti",100),e("2026-11-06","Daal",null),e("2026-11-07","Roti",200)],"2026-11-08");
    expect(report).toMatchObject({ daysLogged: 2, totalEntries: 3, completeCalorieDays: 1, averageRecordedCalories: 200, mostRepeatedFood: { name:"Roti",count:2 } });
  });
  it("has no fictitious average with no entries", () => {
    expect(weeklyInsights([], "2026-11-08")).toMatchObject({daysLogged:0, averageRecordedCalories:null,mostRepeatedFood:null});
  });
});
