import type { GoalSet } from "@/types";

/** An onboarding placeholder is not a user-selected or personalized goal.
 * Never present its seeded numbers as an actual daily target. */
export function visibleDailyGoals(goals: GoalSet | null | undefined): GoalSet | null {
  if (!goals || goals.method === "placeholder") return null;
  return goals;
}
