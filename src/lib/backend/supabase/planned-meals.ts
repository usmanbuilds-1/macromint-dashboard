import { getSupabase } from "@/lib/supabase";
import { BackendError } from "../types";
import type { Json } from "@/integrations/supabase/types";
import type { MealType, PlannedMeal, SavedMealItem } from "@/types";

type Row = {
  id: string; user_id: string; entry_date: string; meal_type: string;
  saved_meal_id: string | null; name: string; items: Json;
  state: string; logged_entry_ids: string[]; eaten_at: string | null;
  created_at: string;
};
function fromRow(row: Row): PlannedMeal {
  if (!Array.isArray(row.items) || (row.state !== "planned" && row.state !== "eaten"))
    throw new BackendError("DATA", "Plan data is invalid");
  return {
    id: row.id, userId: row.user_id, entryDate: row.entry_date,
    mealType: row.meal_type as MealType, savedMealId: row.saved_meal_id,
    name: row.name, items: row.items as unknown as SavedMealItem[],
    state: row.state, loggedEntryIds: row.logged_entry_ids ?? [],
    eatenAt: row.eaten_at, createdAt: row.created_at,
  };
}
function dbError(message: string): BackendError {
  return new BackendError("DB", message.includes("function") || message.includes("schema cache")
    ? "Planning needs the latest database update. Your diary has not been changed."
    : "Could not update your plan. Please retry.");
}

export async function listPlannedMeals(start: string, end: string): Promise<PlannedMeal[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)
     || end < start) throw new BackendError("VALIDATION", "Invalid plan date range");
  const { data, error } = await getSupabase().from("planned_meals").select("*")
    .gte("entry_date", start).lte("entry_date", end)
    .order("entry_date", { ascending: true }).limit(100);
  if (error) throw dbError(error.message);
  return (data ?? []).map(fromRow);
}
export async function addPlannedSavedMeal(id: string, date: string, meal: MealType): Promise<PlannedMeal> {
  const { data, error } = await getSupabase().rpc("plan_saved_meal", {
    p_saved_meal_id: id, p_entry_date: date, p_meal_type: meal,
  });
  if (error || !data) throw dbError(error?.message ?? "Unable to create plan");
  return fromRow(data);
}
export async function commitPlannedMeal(id: string): Promise<{alreadyLogged:boolean; entryIds:string[]}> {
  const { data, error } = await getSupabase().rpc("consume_planned_meal", { p_plan_id: id });
  if (error) throw dbError(error.message);
  const result = data as { alreadyLogged?: unknown; entryIds?: unknown } | null;
  if (!result || typeof result.alreadyLogged !== "boolean" ||
      !Array.isArray(result.entryIds) || result.entryIds.some((x) => typeof x !== "string"))
    throw new BackendError("DATA", "Plan confirmation is unavailable; check Diary before retrying");
  return { alreadyLogged: result.alreadyLogged, entryIds: result.entryIds };
}
export async function deletePlannedMeal(id: string): Promise<void> {
  const { data, error } = await getSupabase().from("planned_meals")
    .delete().eq("id",id).eq("state","planned").select("id").maybeSingle();
  if (error) throw dbError(error.message);
  if (!data) throw new BackendError("NOT_FOUND", "Plan not found or already eaten");
}
