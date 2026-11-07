import type { DiaryEntry } from "@/types";
import { addDaysStr, todayStr } from "@/lib/nutrition/datetime";

/** A deliberate factual recap, not an unvalidated AI coaching prescription. */
export type WeeklyInsight = {
  daysLogged: number;
  totalEntries: number;
  completeCalorieDays: number;
  averageRecordedCalories: number | null;
  mostRepeatedFood: { name: string; count: number } | null;
};
export function weeklyInsights(entries: readonly DiaryEntry[], today: string = todayStr()): WeeklyInsight {
  const first = addDaysStr(today, -6);
  const selected = entries.filter((e) => e.entryDate >= first && e.entryDate <= today);
  const days = new Map<string, { kcal: number; complete: boolean }>();
  const names = new Map<string, { display: string; count: number }>();
  for (const item of selected) {
    const day = days.get(item.entryDate) ?? { kcal: 0, complete: true };
    const value = item.nutrients.kcal;
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) day.kcal += value;
    else day.complete = false;
    days.set(item.entryDate, day);
    const name = item.name.trim();
    if (name) {
      const key = name.toLocaleLowerCase();
      const found = names.get(key);
      names.set(key, { display: name, count: (found?.count ?? 0) + 1 });
    }
  }
  const knownDays = [...days.values()].filter((d) => d.complete);
  const top = [...names.values()].filter((v) => v.count > 1).sort((a, b) => b.count - a.count || a.display.localeCompare(b.display))[0];
  return {
    daysLogged: days.size,
    totalEntries: selected.length,
    completeCalorieDays: knownDays.length,
    averageRecordedCalories: knownDays.length ? Math.round(knownDays.reduce((s, d) => s + d.kcal, 0) / knownDays.length) : null,
    mostRepeatedFood: top ? { name: top.display, count: top.count } : null,
  };
}
