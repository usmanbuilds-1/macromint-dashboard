// Direct Open Food Facts search from the browser (CORS-enabled, keyless).
// Production deployments route through the food-search Edge Function; this
// client path exists only for demo/local mode.

export interface OffClientHit {
  name: string;
  per100g: Record<string, number | null>;
}

export async function searchOffClient(label: string): Promise<OffClientHit | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(label)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,brands,nutriments`,
      { signal: ctrl.signal, headers: { "User-Agent": "Macromint/0.1 (nutrition tracker)" } },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    for (const p of data.products ?? []) {
      const n = p.nutriments ?? {};
      if (!p.product_name || n["energy-kcal_100g"] == null) continue;
      return {
        name: p.brands ? `${p.product_name} (${String(p.brands).split(",")[0]})` : p.product_name,
        per100g: {
          kcal: Math.round(n["energy-kcal_100g"] ?? 0),
          protein: n.proteins_100g ?? null,
          carbs: n.carbohydrates_100g ?? null,
          fat: n.fat_100g ?? null,
        },
      };
    }
  } catch {
    // Unavailable: fall through to the model estimate.
  }
  return null;
}
