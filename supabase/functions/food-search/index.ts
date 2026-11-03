// ═══════════════════════════════════════════════════════════════════════
// Macromint Edge Function: food-search
// Server-side proxy for the food database: verified local foods first,
// Open Food Facts as the remote source. Keeps provider details, caching
// and attribution off the client.
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { json, errorResponse, preflight } from "../_shared/http.ts";

interface FoodRow {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  source: string;
  verified: boolean;
  barcode: string | null;
  per100g: Record<string, number | null>;
  serving_label: string;
  serving_grams: number;
}

const cache = new Map<string, { at: number; payload: unknown }>();
const CACHE_TTL = 10 * 60 * 1000;

const OFF_FIELDS =
  "code,product_name,brands,nutriments,serving_quantity,serving_unit";

function mapOffProduct(p: Record<string, unknown>): Record<string, unknown> | null {
  const name = String(p.product_name ?? "").trim();
  if (!name) return null;
  const n = (p.nutriments ?? {}) as Record<string, number | undefined>;
  if (n["energy-kcal_100g"] == null) return null;
  const servingQ = Number(p.serving_quantity ?? 0);
  return {
    id: null,
    name,
    brand: p.brands ? String(p.brands).split(",")[0].trim() : null,
    category: null,
    source: "off",
    sourceId: p.code ? String(p.code) : null,
    barcode: p.code ? String(p.code) : null,
    verified: false,
    per100g: {
      kcal: Math.round(n["energy-kcal_100g"] ?? 0),
      protein: n.proteins_100g ?? null,
      carbs: n.carbohydrates_100g ?? null,
      fat: n.fat_100g ?? null,
      fiber: n["fiber_100g"] ?? null,
      sugar: n.sugars_100g ?? null,
      satFat: n["saturated-fat_100g"] ?? null,
      sodium: n.sodium_100g != null ? Math.round(n.sodium_100g * 1000) : null,
    },
    servingLabel: servingQ > 0 ? `${Math.round(servingQ)} ${p.serving_unit ?? "g"}` : "100 g",
    servingGrams: servingQ > 0 ? Math.round(servingQ) : 100,
  };
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const barcode = (url.searchParams.get("barcode") ?? "").trim();

  if (!q && !barcode) return errorResponse("BAD_REQUEST", "Provide q or barcode", 400);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return errorResponse("AUTH", "Missing bearer token", 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { error: userError } = await supabase.auth.getUser();
  if (userError) return errorResponse("AUTH", "Invalid token", 401);

  const attribution = "Includes food data from Open Food Facts (ODbL) — openfoodfacts.org";

  let localRows: FoodRow[] = [];
  try {
    if (barcode) {
      const { data: local } = await supabase.from("foods").select("*").eq("barcode", barcode).limit(1);
      localRows = (local ?? []) as FoodRow[];
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OFF_FIELDS}`, {
        headers: { "User-Agent": "Macromint/0.1 (nutrition tracker)" },
      });
      let remote: Record<string, unknown> | null = null;
      if (res.ok) {
        const data = await res.json();
        if (data?.status === 1 && data.product) remote = mapOffProduct(data.product);
      }
      const payload = { local: local ?? [], remote: remote ? [remote] : [], attribution };
      return json(payload);
    }

    if (q.length < 2) return json({ local: [], remote: [], attribution });

    const { data: local } = await supabase
      .from("foods")
      .select("*")
      .ilike("name", `%${q}%`)
      .order("verified", { ascending: false })
      .limit(8);
    localRows = (local ?? []) as FoodRow[];

    let remote: Record<string, unknown>[] = [];
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=8&fields=${OFF_FIELDS}`,
      { headers: { "User-Agent": "Macromint/0.1 (nutrition tracker)" } },
    );
    if (res.ok) {
      const data = await res.json();
      remote = ((data?.products ?? []) as Record<string, unknown>[])
        .map(mapOffProduct)
        .filter((p): p is Record<string, unknown> => p !== null)
        .slice(0, 5);
    }

    const payload = { local: (local ?? []) as FoodRow[], remote, attribution };
    return json(payload);
  } catch (e) {
    // The food database is an external dependency: degrade honestly.
    return json({
      local: localRows,
      remote: [],
      attribution,
      warning: "Remote food data is temporarily unavailable. Local results only.",
    });
  }
});
