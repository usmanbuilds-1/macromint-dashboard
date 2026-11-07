import type { DiaryEntry, MealType } from "@/types";

/** Suggest from the same 8 cached recent rows Today already loads.
 * No new network request and no assumed eating schedule. */
export function rankRecentForMeal(entries: readonly DiaryEntry[], today: string, meal: MealType): DiaryEntry | null {
  const prior = entries.filter((item)=>item.entryDate < today);
  if (!prior.length) return null;
  const byName = new Map<string, {count:number;match:number}>();
  for (const entry of prior) {
    const key = [entry.name.trim().toLocaleLowerCase(),entry.brand?.trim().toLocaleLowerCase()??""].join("|");
    const prev = byName.get(key) ?? {count:0,match:0};
    prev.count++;
    if (entry.mealType === meal) prev.match++;
    byName.set(key,prev);
  }
  return [...prior].sort((a,b)=>{
    const key=(e:DiaryEntry)=>[e.name.trim().toLocaleLowerCase(),e.brand?.trim().toLocaleLowerCase()??""].join("|");
    const x=byName.get(key(a))!,y=byName.get(key(b))!;
    const sa=x.count*3+x.match*2+(a.mealType===meal?1:0),sb=y.count*3+y.match*2+(b.mealType===meal?1:0);
    return sb-sa || b.loggedAt.localeCompare(a.loggedAt);
  })[0]??null;
}
