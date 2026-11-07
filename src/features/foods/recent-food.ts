import type { DiaryEntry, NutrientRecord } from "@/types";
import type { LoggableFood } from "./FoodLogProvider";
import { formatNumber } from "@/lib/utils";

/** A previously logged amount opens in portion review, never silently logs. */
export function recentEntryToLoggable(entry: DiaryEntry): LoggableFood {
  const factor = Math.max(entry.grams, 1) / 100;
  const per100g: NutrientRecord = {};
  for (const [key, value] of Object.entries(entry.baseNutrients) as [keyof NutrientRecord, number | null][]) {
    per100g[key] = value === null || value === undefined ? null : Math.round((value / factor) * 10) / 10;
  }
  const eatenGrams = entry.grams * entry.portionPercent / 100;
  return {
    foodId: entry.foodId,
    name: entry.name,
    brand: entry.brand,
    per100g,
    servingLabel: `${formatNumber(eatenGrams, 0)} g previously eaten`,
    servingGrams: eatenGrams,
    verified: false,
    sourceLabel: "Previously logged",
  };
}

export function uniqueRecentFoods(entries: DiaryEntry[], limit = 4): DiaryEntry[] {
  const names = new Set<string>();
  const result: DiaryEntry[] = [];
  for (const entry of entries) {
    const key = `${entry.name.trim().toLocaleLowerCase()}|${(entry.brand ?? "").trim().toLocaleLowerCase()}`;
    if (!entry.name.trim() || names.has(key)) continue;
    names.add(key);
    result.push(entry);
    if (result.length >= limit) break;
  }
  return result;
}
