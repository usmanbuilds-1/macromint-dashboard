import { useMemo, useState } from "react";
import { toast } from "sonner";
import { backend, bumpData } from "@/lib/backend";
import { foodToLoggable, offToLoggable, type LoggableFood } from "./FoodLogProvider";
import { recipeDraftNutrition, validateRecipeDraft, type RecipeDraft, type RecipeDraftIngredient } from "@/lib/nutrition/recipe-draft";
import { formatNumber } from "@/lib/utils";

export function RecipeBuilder({ template, onSaved, onCancel }: {
  template?: RecipeDraft | null; onSaved: () => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState<RecipeDraft>(template ?? { name:"", servings:2, notes:"", ingredients:[] });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LoggableFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const info = useMemo(() => recipeDraftNutrition(draft), [draft]);
  const lookup = async () => {
    if (query.trim().length < 2 || searching) return;
    setSearching(true);
    try {
      const hit = await backend.searchFoods(query.trim());
      setResults([...hit.local.map(foodToLoggable), ...hit.remote.map(offToLoggable)].slice(0, 12));
    } catch { toast.error("Food search unavailable. Try again."); }
    finally { setSearching(false); }
  };
  const add = (food: LoggableFood) => {
    if (draft.ingredients.length >= 30) { toast.error("Recipes support at most 30 ingredients."); return; }
    const ingredient: RecipeDraftIngredient = {
      key: crypto.randomUUID(), foodId: food.foodId, name: food.name,
      grams: food.servingGrams > 0 ? food.servingGrams : 100, per100g: food.per100g,
    };
    setDraft((current) => ({ ...current, ingredients: [...current.ingredients, ingredient] }));
    setQuery(""); setResults([]);
  };
  const changeIngredient = (key: string, grams: number) =>
    setDraft((current) => ({ ...current, ingredients: current.ingredients.map((ingredient) =>
      ingredient.key === key ? { ...ingredient, grams } : ingredient) }));
  const submit = async () => {
    const error = validateRecipeDraft(draft);
    if (error || saving) { if (error) toast.error(error); return; }
    setSaving(true);
    try {
      await backend.createRecipe({
        name:draft.name.trim(), servings:draft.servings, notes:draft.notes.trim() || null,
        ingredients:draft.ingredients.map(({foodId,name,grams,per100g}) => ({foodId,name,grams,per100g})),
      });
      bumpData(); toast.success("Recipe saved"); onSaved();
    } catch { toast.error("Could not save recipe. No existing recipe was changed."); }
    finally { setSaving(false); }
  };
  return (
    <section className="mm-recipe-builder" aria-label="Recipe builder">
      <div className="mm-recipe-heading"><h3>Build a recipe</h3><button type="button" onClick={onCancel}>Cancel</button></div>
      <label className="mm-feature-field">Recipe name
        <input maxLength={100} value={draft.name} onChange={(event) => setDraft({...draft,name:event.target.value})} placeholder="e.g. Home daal" />
      </label>
      <div className="mm-recipe-meta">
        <label className="mm-feature-field">Servings made
          <input type="number" min={1} max={50} step={1} inputMode="numeric" value={draft.servings}
            onChange={(event)=>setDraft({...draft,servings:Number(event.target.value)})} />
        </label>
        <label className="mm-feature-field">Notes (optional)
          <input maxLength={2000} value={draft.notes} onChange={(event)=>setDraft({...draft,notes:event.target.value})} placeholder="Oil, preparation, batch size…" />
        </label>
      </div>
      <form className="mm-recipe-find" onSubmit={(event) => {event.preventDefault();void lookup();}}>
        <input aria-label="Find ingredient" value={query} onChange={(event)=>{setQuery(event.target.value);setResults([]);}}
          placeholder="Search an ingredient" maxLength={160}/>
        <button type="submit" disabled={searching}>{searching?"Searching…":"Find"}</button>
      </form>
      {results.length > 0 && <ul className="mm-recipe-results" aria-label="Ingredient results">
        {results.map((food,index)=><li key={food.foodId??food.name+index}>
          <span>{food.name}<small>{food.sourceLabel}</small></span>
          <button type="button" onClick={()=>add(food)}>Add</button>
        </li>)}
      </ul>}
      {draft.ingredients.length > 0 && <div className="mm-recipe-ingredients">
        <h4>Ingredients</h4>
        {draft.ingredients.map((item)=><div className="mm-recipe-ingredient" key={item.key}>
          <span>{item.name}</span>
          <label><input type="number" aria-label={`Grams of ${item.name}`} value={item.grams} min={0.1} max={10000} step="any"
            onChange={(event)=>changeIngredient(item.key,Number(event.target.value))} inputMode="decimal"/> g</label>
          <button type="button" aria-label={`Remove ${item.name}`} onClick={()=>setDraft((prev)=>({...prev,ingredients:prev.ingredients.filter((v)=>v.key!==item.key)}))}>Remove</button>
        </div>)}
      </div>}
      <div className="mm-recipe-estimate" role="status">
        <span>{draft.ingredients.length} ingredients · {draft.servings} servings</span>
        <strong>{info.perServingKnownEnergy===null?"—":formatNumber(info.perServingKnownEnergy)} kcal <small>known per serving</small></strong>
        {!info.completeEnergy && draft.ingredients.length>0 && <p>Incomplete energy data. This is a known minimum, not the full recipe calories.</p>}
      </div>
      <button type="button" className="mm-recipe-save" onClick={()=>{void submit();}} disabled={saving||Boolean(validateRecipeDraft(draft))}>
        {saving?"Saving recipe…":"Save recipe"}
      </button>
    </section>
  );
}
