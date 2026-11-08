import { describe,expect,it } from "vitest";
import { goalForLocalDate, parseWeekTargets,validDayTarget } from "./day-targets";
import type { GoalSet } from "@/types";
const base={ userId:"x", calorieTarget:2300,proteinG:110,carbsG:240,fatG:65, fiberG:30,waterMl:2500,method:"manual",manuallyAdjusted:true } as GoalSet;
describe("weekday-specific goals",()=>{
  it("keeps the base goal unchanged for unconfigured days",()=>{
    expect(goalForLocalDate(base,"2026-11-08")?.calorieTarget).toBe(2300);
  });
  it("applies a weekday override only for that local date",()=>{
    const goals={...base,dayTargets:{"1":{calorieTarget:2700,proteinG:140,carbsG:280,fatG:70}}};
    expect(goalForLocalDate(goals,"2026-11-09")?.calorieTarget).toBe(2700);
    expect(goalForLocalDate(goals,"2026-11-08")?.calorieTarget).toBe(2300);
  });
  it("refuses implausible values and poisoned targets",()=>{
    expect(validDayTarget({calorieTarget:700,proteinG:10,carbsG:0,fatG:10})).toBe(false);
    expect(parseWeekTargets({"8":{calorieTarget:2300},"1":{calorieTarget:"2300",proteinG:100,carbsG:200,fatG:50}})).toEqual({});
  });
});
