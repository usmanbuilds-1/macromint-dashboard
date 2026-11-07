import type { Food, NutrientKey, NutrientRecord } from "@/types";
import { MACRO_KEYS, MICRONUTRIENT_KEYS } from "@/types";

export type QualityFacts = {
  provenance: "database" | "user-entered" | "external" | "previously-logged" | "estimated";
  verification: "source-verified" | "not-verified";
  macrosKnown: number;
  microsKnown: number;
  macrosTotal: number;
  microsTotal: number;
  missingEssential: NutrientKey[];
  /** Numeric source verification alone does not prove nutrient completeness. */
  warning: string | null;
};
const known = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function foodQuality(
  food: Pick<Food, "per100g" | "source" | "verified">,
): QualityFacts {
  const data: NutrientRecord = food.per100g ?? {};
  const macrosKnown = MACRO_KEYS.filter((key) => known(data[key])).length;
  const microsKnown = MICRONUTRIENT_KEYS.filter((key) => known(data[key])).length;
  const missingEssential = MACRO_KEYS.filter((key) => !known(data[key]));
  const provenance = food.source === "custom" ? "user-entered"
    : food.source === "off" ? "external" : "database";
  return {
    provenance,
    verification: food.verified ? "source-verified" : "not-verified",
    macrosKnown, microsKnown,
    macrosTotal: MACRO_KEYS.length, microsTotal: MICRONUTRIENT_KEYS.length,
    missingEssential,
    warning: missingEssential.length ? "Some calories or macros are unavailable" :
      !food.verified ? "Values have not been independently verified" : null,
  };
}
export function loggableFoodQuality(
  data: { per100g: NutrientRecord; verified: boolean; sourceLabel: string },
): QualityFacts {
  const source = /previously logged/i.test(data.sourceLabel) ? "previously-logged"
    : /scan|estimate|ai/i.test(data.sourceLabel) ? "estimated"
      : /open food facts|off|external/i.test(data.sourceLabel) ? "external"
      : /custom|quick|manual/i.test(data.sourceLabel) ? "user-entered" : "database";
  const result = foodQuality({ per100g: data.per100g, source: source === "user-entered" ? "custom" : source === "external" ? "off" : "seed", verified: data.verified });
  return { ...result, provenance: source };
}
