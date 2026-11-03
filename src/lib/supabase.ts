// Compatibility shim for code ported from the original Macromint Vite app.
// The original app imported its Supabase client from here; in this project the
// generated Lovable Cloud client lives at @/integrations/supabase/client.
import { supabase } from "@/integrations/supabase/client";
import type { Food, FoodSource, NutrientRecord } from "@/types";

export function getSupabase() {
  return supabase;
}

export const IS_SUPABASE_CONFIGURED = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

/** Map a `foods` table row (snake_case) to the app's `Food` shape. */
export function mapFoodRow(row: Record<string, unknown>): Food {
  return {
    id: String(row.id),
    ownerId: (row.owner_id as string | null) ?? null,
    name: String(row.name ?? ""),
    brand: (row.brand as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    source: (row.source as FoodSource) ?? "custom",
    sourceId: (row.source_id as string | null) ?? null,
    barcode: (row.barcode as string | null) ?? null,
    verified: Boolean(row.verified),
    per100g: (row.per100g ?? {}) as NutrientRecord,
    servingLabel: String(row.serving_label ?? "serving"),
    servingGrams: Number(row.serving_grams ?? 100),
    createdAt: String(row.created_at ?? ""),
  };
}
