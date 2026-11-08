import { useState } from "react";
import { toast } from "sonner";
import { backend, bumpData } from "@/lib/backend";
import { useAsyncData } from "@/hooks/useData";
import { todayStr } from "@/lib/nutrition/datetime";
import { suggestedMealNow } from "@/lib/nutrition/meal-slot";
import { RecipeBuilder } from "./RecipeBuilder";
import { RecipeLinkImport } from "./RecipeLinkImport";
import type { RecipeDraft } from "@/lib/nutrition/recipe-draft";
import type { Recipe } from "@/types";

export function RecipeLibrary({ active }: { active: boolean }) {
  const list = useAsyncData(() => backend.getRecipes(), [], "recipes", active);
  const [creating, setCreating] = useState(false);
  const [template, setTemplate] = useState<RecipeDraft | null>(null);
  const [sourceIngredients,setSourceIngredients] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [amount, setAmount] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [revising, setRevising] = useState(false);
  const recipe = list.data?.find((item) => item.id === expanded);
  const ingredients = useAsyncData(() => backend.getRecipeIngredients(expanded!), [expanded], "recipe:ingredients",active&&Boolean(expanded));
  const log = async (item: Recipe) => {
    if (busy || !Number.isFinite(amount) || amount < 0.1 || amount > 50) return;
    setBusy(item.id);
    try {
      await backend.logRecipe(item.id, todayStr(), suggestedMealNow(), amount);
      bumpData(); toast.success("Recipe added to today's diary");
    } catch { toast.error("Could not log recipe. Check today's diary before retrying."); }
    finally { setBusy(null); }
  };
  const remove = async (id: string) => {
    setBusy(id);
    try {
      await backend.deleteRecipe(id); bumpData();setExpanded(null);
      toast.success("Recipe deleted. Previously logged food remains unchanged.");
    } catch { toast.error("Could not delete recipe."); }
    finally { setBusy(null); }
  };
  const duplicate = () => {
    if (!recipe || !ingredients.data) return;
    setTemplate({ name: recipe.name+" (copy)", servings:recipe.servings, notes:recipe.notes??"",
      ingredients:ingredients.data.map((item) => ({
        key:crypto.randomUUID(), foodId:item.foodId, name:item.name,grams:item.grams,per100g:item.per100g,
      })),
    });setSourceIngredients([]);setCreating(true);setRevising(false);
  };
  if (creating) return <RecipeBuilder template={template} sourceIngredients={sourceIngredients}
    onCancel={()=>{setCreating(false);setTemplate(null);setSourceIngredients([]);}}
    onSaved={()=>{setCreating(false);setTemplate(null);setSourceIngredients([]);list.reload();}}/>;
  return (
    <section className="mm-recipe-library" aria-label="Your recipes">
      <div className="mm-recipe-heading">
        <div><h2>Recipes</h2><p>Build once. Log the same home-cooked meal again.</p></div>
        <button type="button" className="mm-recipe-add" onClick={()=>{setTemplate(null);setSourceIngredients([]);setCreating(true);}}>New recipe</button>
      </div>
      <RecipeLinkImport onImported={(recipe) => {
        setTemplate({name:recipe.name,servings:recipe.servings??2,
          notes:recipe.source?`Source: ${recipe.source}`:"",ingredients:[]});
        setSourceIngredients(recipe.ingredients);
        setCreating(true);
      }} />
      {list.error && <p role="alert">Could not load recipes. <button type="button" onClick={list.reload}>Retry</button></p>}
      {list.loading&&!list.data&&<p role="status">Loading recipes…</p>}
      {!list.loading&&!list.data?.length&&!list.error&&<p className="mm-feature-muted">Your first recipe will appear here after you save it.</p>}
      <ul className="mm-recipe-list">{(list.data??[]).map((item)=><li key={item.id}>
        <button className="mm-recipe-row" type="button" aria-expanded={expanded===item.id} onClick={()=>{setExpanded(expanded===item.id?null:item.id);setRevising(false);setAmount(1);}}>
          <span><strong>{item.name}</strong><small>{item.servings} servings in the batch</small></span><span>{expanded===item.id?"Hide":"Details"}</span>
        </button>
        {expanded===item.id&&<div className="mm-recipe-detail">
          {ingredients.loading&&<p role="status">Loading ingredients…</p>}
          {ingredients.error&&<p role="alert">Ingredients unavailable. <button type="button" onClick={ingredients.reload}>Retry</button></p>}
          {!!ingredients.data?.length&&<ul>{ingredients.data.map((ing)=><li key={ing.id}>{ing.name} · {ing.grams} g</li>)}</ul>}
          <div className="mm-recipe-actions">
            <label>Servings to eat <input type="number" aria-label="Servings to log" min={0.1} max={50} step={0.1} value={amount} onChange={(e)=>setAmount(Number(e.target.value))}/></label>
            <button type="button" className="mm-recipe-save" disabled={busy===item.id||!ingredients.data?.length} onClick={()=>{void log(item);}}>Log recipe</button>
          </div>
          <div className="mm-recipe-secondary-actions">
            <button type="button" disabled={!ingredients.data?.length} onClick={duplicate}>Copy and edit</button>
            {!revising?<button type="button" onClick={()=>setRevising(true)}>Delete recipe</button>:(
              <span>Delete this recipe? <button type="button" disabled={!!busy} onClick={()=>void remove(item.id)}>Confirm</button> <button type="button" onClick={()=>setRevising(false)}>Cancel</button></span>
            )}
          </div>
        </div>}
      </li>)}</ul>
    </section>
  );
}
