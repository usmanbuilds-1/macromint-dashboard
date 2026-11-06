import { getSupabase } from "@/lib/supabase";
import type { SavedMeal } from "@/types";
import { BackendError } from "../types";

/** Saved-meal management is account-scoped even if RLS policies later change. */
export async function renameSavedMealForUser(id: string, name: string, userId: string): Promise<SavedMeal> {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    throw new BackendError("VALIDATION", "Meal name must be 1–100 characters");
  }
  const { data, error } = await getSupabase()
    .from("saved_meals")
    .update({ name: trimmed })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw new BackendError("DB", error.message);
  return {
    id: String(data.id),
    userId: String(data.user_id),
    name: String(data.name),
    items: data.items as unknown as SavedMeal["items"],
    createdAt: String(data.created_at),
  };
}

export async function deleteSavedMealForUser(id: string, userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("saved_meals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new BackendError("DB", error.message);
}
