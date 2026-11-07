/** Recognize candidate food names, not calories, allergens, or weights.
 * No item is logged until a user finds a match and reviews its portion. */
export interface DescribedFood { original: string; searchTerm: string; amountText: string | null; }
const ALIASES: Record<string, string> = {
  "anda": "egg", "anday": "eggs", "doodh": "milk", "chawal": "rice",
  "daal": "lentils", "dal": "lentils", "chai": "tea",
};
export function describeMeal(input: string): DescribedFood[] {
  const clean = input.trim();
  if (clean.length > 400) throw new RangeError("Meal descriptions must be 400 characters or less.");
  const parts = clean.split(/\s*(?:,|;|\+|\band\b|\baur\b)\s*/i).filter(Boolean);
  if (parts.length > 8) throw new RangeError("Describe at most eight foods at a time.");
  return parts.map((part) => {
    const original = part.trim();
    if (!original || original.length > 100) throw new RangeError("Each food description must be under 100 characters.");
    const m = original.match(/^(\d+(?:\.\d+)?)\s*(g|grams?|kg|ml|cups?|tsp|tbsp|slices?|pieces?|pcs|medium|small|large)?\s*(.+)$/i);
    const amountText = m ? [m[1],m[2]].filter(Boolean).join(" ") : null;
    const foodText = (m?.[3] ?? original).trim();
    const name = foodText.replace(/^(?:of|a|an)\s+/i,"").toLowerCase();
    return { original, amountText, searchTerm: ALIASES[name] ?? name };
  });
}
