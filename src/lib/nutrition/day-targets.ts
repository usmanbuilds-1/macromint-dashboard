import type { DayGoalTargets, GoalSet, WeeklyGoalTargets } from "@/types";
import { parseLocalDate } from "./datetime";
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] as const;
export { DAY_NAMES };
const LIMITS = {
  calorieTarget: [800,10000], proteinG: [10,500], carbsG: [0,1200], fatG: [10,400],
} as const;
export function validDayTarget(value: unknown): value is DayGoalTargets {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const object = value as Record<string,unknown>;
  if (Object.keys(object).length !== 4) return false;
  return (Object.keys(LIMITS) as (keyof DayGoalTargets)[]).every((key) => {
    const v = object[key], [min,max] = LIMITS[key];
    return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
  });
}
export function parseWeekTargets(raw: unknown): WeeklyGoalTargets {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: WeeklyGoalTargets = {};
  for (const [key,value] of Object.entries(raw)) {
    if (/^[0-6]$/.test(key) && validDayTarget(value))
      result[key as keyof WeeklyGoalTargets] = value;
  }
  return result;
}
export function goalForLocalDate(goals: GoalSet | null, date: string): GoalSet | null {
  if (!goals) return null;
  const weekday = parseLocalDate(date).getDay().toString() as keyof WeeklyGoalTargets;
  const replacement = goals.dayTargets?.[weekday];
  return replacement ? { ...goals, ...replacement } : goals;
}
