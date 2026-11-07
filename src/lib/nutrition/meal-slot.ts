import type { MealType } from "@/types";

/** Local-time default, never a silent permanent meal assignment. */
export function suggestedMealAtHour(hour: number): MealType {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new RangeError("Hour must be between 0 and 23");
  return hour < 11 ? "breakfast" : hour < 15 ? "lunch" : hour < 21 ? "dinner" : "snacks";
}

export function suggestedMealNow(): MealType {
  return suggestedMealAtHour(new Date().getHours());
}
