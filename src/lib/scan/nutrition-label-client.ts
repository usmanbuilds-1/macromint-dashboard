import { getSupabase, IS_SUPABASE_CONFIGURED } from "@/lib/supabase";
import { prepareImage } from "./client";
import type { LabelResult } from "../../../supabase/functions/ai-scan/nutrition-label";

/** Uses the SAME authenticated and atomically rate-limited ai-scan endpoint.
 * It never auto-creates food, logs a diary entry or stores a photo. */
export async function readNutritionLabel(file: File): Promise<LabelResult> {
  if (!IS_SUPABASE_CONFIGURED) throw new Error("Nutrition label recognition requires the configured server.");
  const image = await prepareImage(file);
  const { data, error } = await getSupabase().functions.invoke("ai-scan", {
    body: { image, mode: "nutrition_label" },
  });
  if (error || !data || data.error || data.mode !== "nutrition_label")
    throw new Error(data?.message ?? "Could not read label. Check scanning limits or enter values manually.");
  if (!Array.isArray(data.warnings) || typeof data.observed !== "object")
    throw new Error("Invalid recognition response. Enter the nutrition manually.");
  return data as LabelResult;
}
