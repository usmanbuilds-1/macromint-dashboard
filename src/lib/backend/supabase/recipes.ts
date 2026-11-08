import { getSupabase } from "@/lib/supabase";
import type { Json } from "@/integrations/supabase/types";
import { BackendError, type AddEntryInput, type RecipeInput } from "../types";
import { applyPortionPercent, sumNutrients, scaleNutrients } from "@/lib/nutrition/math";
import type { DiaryEntry, MealType, NutrientRecord, Recipe, RecipeIngredient } from "@/types";

const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;
function fromRecipe(row: Record<string,unknown>): Recipe {
  return {
    id:String(row["id"]),userId:String(row["user_id"]),name:String(row["name"]),
    servings:numeric(row["servings"])||1,notes:(row["notes"] as string|null)??null,
    createdAt:String(row["created_at"]),
  };
}
function validateRecipe(input: RecipeInput) {
  if (!input.name.trim() || input.name.length>100 || !Number.isInteger(input.servings) ||
    input.servings<1 || input.servings>50 || (input.notes?.length??0)>2000 ||
    input.ingredients.length<1 || input.ingredients.length>30) {
    throw new BackendError("VALIDATION","Invalid recipe details");
  }
  for(const item of input.ingredients) {
    if (!item.name.trim() || item.name.length>160 || !Number.isFinite(item.grams) ||
      item.grams<.1 || item.grams>10000 ||
      Object.values(item.per100g).some((v)=>v!==null &&
        (typeof v!=="number" || !Number.isFinite(v) || v<0 || v>1_000_000))) {
      throw new BackendError("VALIDATION","Invalid ingredient or nutrition quantity");
    }
  }
}
export async function listRecipes(): Promise<Recipe[]> {
  const { data,error }=await getSupabase().from("recipes").select("*")
    .order("created_at",{ascending:false}).limit(250);
  if(error) throw new BackendError("DB",error.message);
  return (data??[]).map((row)=>fromRecipe(row));
}
export async function recipeIngredients(id:string):Promise<RecipeIngredient[]> {
  const {data,error}=await getSupabase().from("recipe_ingredients").select("*")
    .eq("recipe_id",id).order("position",{ascending:true}).limit(30);
  if(error) throw new BackendError("DB",error.message);
  return (data??[]).map((row)=>({
    id:String(row["id"]),recipeId:String(row.recipe_id),
    foodId:(row.food_id as string|null)??null,name:String(row["name"]),
    grams:numeric(row.grams),per100g:(row.per100g??{}) as NutrientRecord,
  }));
}
export async function createRecipeAtomic(input:RecipeInput):Promise<Recipe> {
  validateRecipe(input);
  const {data,error}=await getSupabase().rpc("create_recipe_atomic",{
    p_name:input.name.trim(),p_servings:input.servings,
    p_notes:input.notes??null,p_ingredients:input.ingredients as unknown as Json,
  });
  if(error||!data) throw new BackendError("DB",
    "Could not create recipe. No incomplete recipe was saved.");
  return fromRecipe(data);
}
export async function replaceRecipeAtomic(id:string,input:RecipeInput):Promise<void> {
  validateRecipe(input);
  const {data,error}=await getSupabase().rpc("replace_recipe",{
    p_recipe_id:id,p_name:input.name.trim(),p_servings:input.servings,
    p_notes:input.notes??null,p_ingredients:input.ingredients as unknown as Json,
  });
  if(error||!data) throw new BackendError("DB",
    "Could not update recipe. The previous version was preserved.");
}
export async function removeRecipe(id:string):Promise<void> {
  const {data,error}=await getSupabase().from("recipes").delete().eq("id",id)
    .select("id").maybeSingle();
  if(error) throw new BackendError("DB",error.message);
  if(!data) throw new BackendError("NOT_FOUND","Recipe unavailable");
}
export async function logRecipeEntry(id:string,date:string,meal:MealType,servings:number,
  addEntry:(input:AddEntryInput)=>Promise<DiaryEntry>):Promise<DiaryEntry> {
  if(!Number.isFinite(servings)||servings<.1||servings>50) throw new BackendError("VALIDATION","Invalid servings");
  const {data,error}=await getSupabase().from("recipes").select("*").eq("id",id).maybeSingle();
  if(error) throw new BackendError("DB",error.message);
  if(!data) throw new BackendError("NOT_FOUND","Recipe unavailable");
  const ingredients=await recipeIngredients(id);
  if(!ingredients.length) throw new BackendError("DATA","Recipe has no ingredients");
  const total=sumNutrients(ingredients.map((item)=>scaleNutrients(item.per100g,item.grams)));
  const consumed=applyPortionPercent(total,servings/numeric(data.servings)*100);
  return addEntry({
    entryDate:date,mealType:meal,recipeId:id,name:data.name,
    grams:100*servings,portionPercent:100,baseNutrients:consumed,source:"recipe",
  });
}
