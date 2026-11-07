/** Optional, EDITABLE kitchen approximations; not exact food composition data.
 * The user must review grams before logging. Do not apply these weights
 * automatically to caloric or macro calculations. */
export type RegionalPortion = { id: string; label: string; grams: number; note: string };
const RULES: Array<{ test: RegExp; items: RegionalPortion[] }> = [
  { test: /\b(roti|chapati|phulka)\b/i, items: [
    { id: "roti", label: "1 medium roti", grams: 40, note: "Approximate weight; size and thickness vary" },
  ] },
  { test: /\b(dal|daal|lentil|salan|curry|sabzi)\b/i, items: [
    { id: "katori", label: "1 katori", grams: 175, note: "Approximate bowl portion; check your bowl" },
  ] },
  { test: /\b(chawal|cooked rice|biryani|pulao)\b/i, items: [
    { id: "rice-cup", label: "1 cup cooked", grams: 160, note: "Approximate cooked portion; packed density varies" },
  ] },
  { test: /\b(chai|tea|milk)\b/i, items: [
    { id: "drink-cup", label: "1 cup", grams: 240, note: "Approximate liquid-equivalent; ingredients vary" },
  ] },
  { test: /\b(ghee|cooking oil|olive oil|canola oil)\b/i, items: [
    { id: "oil-tsp", label: "1 teaspoon", grams: 4.5, note: "Approximate household measure" },
    { id: "oil-tbsp", label: "1 tablespoon", grams: 13.5, note: "Approximate household measure" },
  ] },
];
export function regionalPortions(foodName: string): RegionalPortion[] {
  const name = foodName.trim().slice(0, 180);
  return RULES.find((rule) => rule.test.test(name))?.items ?? [];
}
