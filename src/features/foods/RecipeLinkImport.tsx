import { useState } from "react";
import { toast } from "sonner";
import { getSupabase,IS_SUPABASE_CONFIGURED } from "@/lib/supabase";
import { extractRecipeFromHtml, type ImportableRecipe } from "../../../supabase/functions/recipe-import/schema-recipe";

const URL_IMPORT_AVAILABLE = import.meta.env.VITE_RECIPE_URL_IMPORT_ENABLED === "true";

export function RecipeLinkImport({ onImported }: {
  onImported:(recipe:ImportableRecipe & {source?:string})=>void;
}) {
  const [url,setUrl]=useState("");
  const [jsonText,setJsonText]=useState("");
  const [busy,setBusy]=useState(false);
  const fromUrl=async()=>{
    if(busy||!url.trim())return;
    if(!IS_SUPABASE_CONFIGURED){
      toast.info("Recipe URL import needs the configured server. You can paste recipe JSON below.");
      return;
    }
    setBusy(true);
    try{
      const {data,error}=await getSupabase().functions.invoke("recipe-import",{body:{url:url.trim()}});
      if(error||!data||data.error||!Array.isArray(data.ingredients)||
         typeof data.name!=="string")throw new Error(data?.message??"This link isn't supported.");
      onImported({name:data.name,servings:typeof data.servings==="number"?data.servings:null,
        ingredients:data.ingredients.slice(0,30),source:data.source});
    }catch(e){toast.error(e instanceof Error?e.message:"Could not import the recipe.");}
    finally{setBusy(false);}
  };
  const fromPasted=()=>{
    if(jsonText.length>30_000){toast.error("Paste under 30 KB");return;}
    const parsed=extractRecipeFromHtml(
      `<script type="application/ld+json">${jsonText.replace(/<\/script/gi,"")}</script>`);
    if(!parsed){toast.error("Could not find a schema.org Recipe ingredient list.");return;}
    onImported(parsed);
  };
  return (
    <details className="mm-feature-disclosure mm-recipe-import">
      <summary className="mm-feature-disclosure-trigger">Import recipe ingredients</summary>
      <div className="mm-feature-body">
        <p className="mm-feature-muted">
          Imports ingredient names only. Review every food and gram amount before saving.
          No nutrition numbers are guessed. Every ingredient must be matched manually.
        </p>
        {URL_IMPORT_AVAILABLE && <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={(e)=>{e.preventDefault();void fromUrl();}}>
          <label className="mm-feature-field">Recipe URL
            <input type="url" maxLength={500} autoComplete="off" inputMode="url"
              placeholder="https://www.bbcgoodfood.com/recipes/…"
              value={url} onChange={(e)=>setUrl(e.target.value)} />
          </label>
          <button type="submit" className="mm-recipe-save self-end" disabled={busy||!url.trim()}>
            {busy?"Importing…":"Import link"}
          </button>
        </form>}
        {!URL_IMPORT_AVAILABLE && <p className="mm-feature-muted">Direct link importing is unavailable until the recipe server has been approved. You can still paste recipe JSON-LD locally.</p>}
        <details className="border-t pt-2">
          <summary className="min-h-11 cursor-pointer text-sm font-semibold">Or paste recipe JSON-LD</summary>
          <p className="mm-feature-muted">A safe fallback when a site blocks automated imports. No server fetch is needed.</p>
          <textarea className="mt-2 min-h-24 w-full rounded border bg-transparent p-3 text-xs"
            aria-label="Recipe JSON-LD" maxLength={30_000} value={jsonText}
            onChange={(e)=>setJsonText(e.target.value)} placeholder={'{"@type":"Recipe","name":"...","recipeIngredient":["..."]}'} />
          <button type="button" disabled={!jsonText.trim()} onClick={fromPasted}
            className="mt-2 min-h-11 rounded border px-3 text-sm font-semibold">
            Review imported ingredients
          </button>
        </details>
      </div>
    </details>
  );
}
