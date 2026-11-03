/**
 * Shared input safety ceilings. These are plausible adult-app entry bounds,
 * NOT statements about every possible human body or individual medical care.
 * Always validate at save time as well as specifying input min/max attributes.
 */
export const LIMITS = {
  ageYears: { min: 20, max: 100, unit: "years" },
  heightCm: { min: 120, max: 240, unit: "cm" },
  weightKg: { min: 25, max: 450, unit: "kg" },
  weightLb: { min: 25 * 2.2046226218487757, max: 450 * 2.2046226218487757, unit: "lb" },
  foodGrams: { min: 0.1, max: 10000, unit: "g" },
  portionPercent: { min: 1, max: 100, unit: "%" },
  calorieTarget: { min: 800, max: 10000, unit: "kcal" },
  proteinG: { min: 10, max: 500, unit: "g" },
  carbsG: { min: 0, max: 1200, unit: "g" },
  fatG: { min: 10, max: 400, unit: "g" },
  fiberG: { min: 0, max: 150, unit: "g" },
  waterMl: { min: 500, max: 8000, unit: "ml" },
  foodKcalPer100g: { min: 0, max: 1000, unit: "kcal per 100 g" },
  foodMacroPer100g: { min: 0, max: 100, unit: "g per 100 g" },
  recipeServings: { min: 1, max: 1000, unit: "servings" },
} as const;

export type NumericLimitKey = keyof typeof LIMITS;

export function withinLimit(value: unknown, key: NumericLimitKey): value is number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  const { min, max } = LIMITS[key];
  return Number.isFinite(n) && n >= min && n <= max;
}

export function validateNumeric(value: unknown, key: NumericLimitKey, label: string): { value: number } | { error: string } {
  if (typeof value === "string" && value.trim() === "") return { error: `Enter ${label.toLowerCase()}.` };
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return { error: `Enter a valid number for ${label.toLowerCase()}.` };
  const { min, max, unit } = LIMITS[key];
  if (n < min || n > max) return { error: `${label} must be between ${Number(min.toFixed(1))} and ${Number(max.toFixed(1))} ${unit}.` };
  return { value: n };
}

/** Use numeric bounds without silently clamping 999 to a valid value. */
export function numericInputBounds(key: NumericLimitKey) {
  const { min, max } = LIMITS[key];
  return { min, max };
}
