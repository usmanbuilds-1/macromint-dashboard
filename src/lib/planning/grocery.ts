import type { SavedMeal } from "@/types";
export interface GroceryLine { name: string; grams: number; sources: number; }
export function groceryFromSavedMeals(meals: readonly SavedMeal[], counts: Readonly<Record<string, number>>): GroceryLine[] {
  const byName = new Map<string, GroceryLine>();
  let totalItems = 0;
  for (const meal of meals) {
    const count = counts[meal.id] ?? 0;
    if (!Number.isInteger(count) || count < 0 || count > 14) throw new RangeError("Each meal must be selected 0 to 14 times.");
    for (const ingredient of meal.items) {
      if (!count) continue;
      totalItems++;
      if (totalItems > 300) throw new RangeError("Shopping list is too large.");
      if (!Number.isFinite(ingredient.grams) || ingredient.grams <= 0 || ingredient.grams > 10000) continue;
      const key = ingredient.name.trim().toLocaleLowerCase();
      if (!key) continue;
      const prev = byName.get(key);
      if (prev) { prev.grams += ingredient.grams * count;prev.sources++; }
      else byName.set(key,{name:ingredient.name.trim(),grams:ingredient.grams*count,sources:1});
    }
  }
  return [...byName.values()].map((x)=>({...x,grams:Math.round(x.grams)})).sort((a,b)=>a.name.localeCompare(b.name));
}
