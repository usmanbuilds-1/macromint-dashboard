import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { SavedMeal } from "@/types";
import { groceryFromSavedMeals } from "@/lib/planning/grocery";

export function GroceryList({ meals }: {meals: SavedMeal[]}) {
  const [counts,setCounts]=useState<Record<string,number>>({});
  const lines=useMemo(()=>groceryFromSavedMeals(meals,counts),[meals,counts]);
  const text=lines.map((row)=>`${row.name} — ${row.grams} g`).join("\n");
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw Error("No clipboard");
      await navigator.clipboard.writeText(text);toast.success("Grocery list copied");
    } catch {toast.info("Select the list below to copy it manually.");}
  };
  if (!meals.length) return null;
  return (
    <details className="mm-feature-disclosure mm-grocery" aria-label="Shopping list from saved meals">
      <summary className="mm-feature-disclosure-trigger">Shopping list from saved meals</summary>
      <div className="mm-feature-body">
        <p className="mm-feature-muted">Choose how many times you'll prepare each saved meal. This is a temporary list, not an entry in your food diary.</p>
        <div className="mm-grocery-meals">
          {meals.map((meal)=><label key={meal.id}><span>{meal.name}</span>
            <select aria-label={`Times to prepare ${meal.name}`} value={counts[meal.id]??0} onChange={(event)=>setCounts((current)=>({...current,[meal.id]:Number(event.target.value)}))}>
              {Array.from({length:8},(_,i)=><option key={i} value={i}>{i} ×</option>)}
            </select>
          </label>)}
        </div>
        {!!lines.length&&<>
          <h3 className="mm-grocery-title">Ingredients to buy</h3>
          <ul className="mm-grocery-ingredients">{lines.map((item)=><li key={item.name}><span>{item.name}</span><strong className="tabular-nums">{item.grams} g</strong></li>)}</ul>
          <p className="mm-feature-muted">Quantities use saved recipe portions. Adjust for cooking yield, pantry stock and ingredients already on hand.</p>
          <button type="button" className="mm-grocery-copy" onClick={()=>{void copy();}}>Copy shopping list</button>
          <textarea readOnly aria-label="Grocery list text" value={text} rows={Math.min(6,lines.length)} />
        </>}
      </div>
    </details>
  );
}
