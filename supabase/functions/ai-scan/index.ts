// ═══════════════════════════════════════════════════════════════════════
// Macromint Edge Function: ai-scan
//
// Photo → structured, database-grounded nutrition estimate.
//
// Accuracy system (see docs/AI-SCANNING.md):
//   1. One vision call returns items with portions AND per-item macros.
//   2. Every item is matched against the verified food database; when a
//      match is strong enough the database values REPLACE the model's
//      numbers (models are unreliable at exact arithmetic; databases are
//      not). Unmatched items optionally fall back to Open Food Facts.
//   3. Plausibility validation (Atwater consistency, bounds) downgrades
//      or flags implausible items.
//   4. Confidence is computed from model self-report + grounding + flags.
//   5. The client always shows an editable review step — scans are never
//      auto-logged — and corrections are stored for future context.
//
// Secrets: GEMINI_API_KEY or OPENAI_API_KEY (set via `supabase secrets set`).
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { json, errorResponse, preflight, CORS_HEADERS } from "../_shared/http.ts";

const GEMINI_MODELS = [
  ...(Deno.env.get("GEMINI_MODELS") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];
const OPENAI_MODEL = Deno.env.get("AI_MODEL") ?? "gpt-4o-mini";
const MAX_IMAGE_BYTES = 3_000_000;
const MATCH_THRESHOLD = 0.55;
const OFF_MAX_PER_RUN = 3;

const SYSTEM_PROMPT = `You are a careful nutrition vision analyst examining one photo of food or drink.
For EACH distinct visible food or drink item:
1. Name it specifically (e.g. "fried chicken thigh", "white rice", "sweetened chai").
2. Estimate the portion in grams using visual scale cues: standard dinner plates are about 26 cm, bowls about 12 cm, cutlery and hands provide scale. Account for cooking method (fried, grilled, oil, ghee, sauces) and added sugar in drinks.
3. Round grams to the nearest 5 and calories to the nearest 10; round macros to whole grams. Avoid false precision.
4. Estimate kcal, protein, carbs, fat for the item at the estimated portion.
5. Report confidence low, medium or high based on visibility and scale certainty.
Do not invent items that are not visible. If the user adds notes, use them only to disambiguate what is visible, never to add unseen items. If there is no food, return an empty items array.
Respond with ONLY JSON, no markdown:
{"items":[{"label":string,"grams":number,"confidence":"low"|"medium"|"high","kcal":number,"protein":number,"carbs":number,"fat":number}],"notes":string}`;

interface ModelItem {
  label: string;
  grams: number;
  confidence: "low" | "medium" | "high";
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface GroundedFood {
  id: string;
  name: string;
  per100g: Record<string, number | null>;
  source: string;
}

function clamp(n: number, max: number): number {
  return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 0), max) : 0;
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(json)?/gi, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const raw = match[0];
  try {
    return JSON.parse(raw);
  } catch {
    // Repair pass for common model output quirks.
  }
  const repaired = raw
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/([{,]\s*)'([^']+?)'(\s*:)/g, '$1"$2"$3')
    .replace(/:\s*'([^']*?)'/g, ': "$1"')
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3');
  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

function parseItems(raw: unknown): { items: ModelItem[]; notes: string } {
  const obj = raw as { items?: unknown[]; notes?: string } | null;
  if (!obj || !Array.isArray(obj.items)) return { items: [], notes: "" };
  const items: ModelItem[] = [];
  for (const it of obj.items) {
    const o = it as Record<string, unknown>;
    const label = String(o.label ?? "").trim().slice(0, 120);
    if (!label) continue;
    const conf = String(o.confidence ?? "low").toLowerCase();
    items.push({
      label,
      grams: clamp(Number(o.grams ?? 0), 1500),
      confidence: conf === "high" || conf === "medium" ? (conf as "high" | "medium") : "low",
      kcal: clamp(Number(o.kcal ?? 0), 2000),
      protein: clamp(Number(o.protein ?? 0), 500),
      carbs: clamp(Number(o.carbs ?? 0), 800),
      fat: clamp(Number(o.fat ?? 0), 400),
    });
  }
  return { items: items.slice(0, 10), notes: String(obj.notes ?? "").slice(0, 300) };
}

// ── Vision providers ──────────────────────────────────────────────────────

async function callGemini(apiKey: string, mime: string, b64: string, userPrompt: string): Promise<string> {
  let lastError: unknown = null;
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [
              {
                role: "user",
                parts: [{ inline_data: { mime_type: mime, data: b64 } }, { text: userPrompt }],
              },
            ],
            generationConfig: { response_mime_type: "application/json", temperature: 0.2 },
          }),
        },
      );
      if (!res.ok) {
        lastError = new Error(`Gemini ${model} HTTP ${res.status}`);
        if ([429, 404, 500, 503].includes(res.status)) continue;
        throw lastError;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (text) return text;
      lastError = new Error(`Gemini ${model} returned no text`);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error("All Gemini models failed");
}

async function callOpenAI(apiKey: string, mime: string, b64: string, userPrompt: string, lovable = false): Promise<string> {
  const res = await fetch(lovable ? "https://ai.gateway.lovable.dev/v1/chat/completions" : "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: lovable ? Deno.env.get("LOVABLE_VISION_MODEL") ?? "google/gemini-2.5-flash" : OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// ── Grounding: database match + Open Food Facts fallback ─────────────────

function tokenize(s: string): Set<string> {
  return new Set(
    s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((t) => t.length > 2),
  );
}

function matchScore(a: string, b: string): number {
  const A = tokenize(a);
  const B = tokenize(b);
  if (!A.size || !B.size) return 0;
  let overlap = 0;
  for (const t of A) {
    if (B.has(t)) overlap += 1;
    else if ([...B].some((u) => u.startsWith(t) || t.startsWith(u))) overlap += 0.5;
  }
  return overlap / Math.max(A.size, B.size);
}

function bestDbMatch(label: string, foods: GroundedFood[]): GroundedFood | null {
  let best: GroundedFood | null = null;
  let bestScore = 0;
  for (const f of foods) {
    const score = Math.max(matchScore(label, f.name), matchScore(f.name, label));
    if (score > bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return bestScore >= MATCH_THRESHOLD ? best : null;
}

interface OffNutriments {
  "energy-kcal_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  "saturated-fat_100g"?: number;
  sodium_100g?: number;
}

async function searchOff(label: string): Promise<GroundedFood | null> {
  try {
    const url =
      "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" +
      encodeURIComponent(label) +
      "&search_simple=1&action=process&json=1&page_size=5" +
      "&fields=product_name,brands,nutriments";
    const res = await fetch(url, {
      headers: { "User-Agent": "Macromint/0.1 (nutrition tracker)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const products = (data?.products ?? []) as Array<{
      product_name?: string;
      brands?: string;
      nutriments?: OffNutriments;
    }>;
    for (const p of products) {
      const n = p.nutriments;
      if (!p.product_name || !n || n["energy-kcal_100g"] == null) continue;
      return {
        id: "",
        name: p.brands ? `${p.product_name} (${p.brands.split(",")[0]})` : p.product_name,
        per100g: {
          kcal: Math.round(n["energy-kcal_100g"] ?? 0),
          protein: n.proteins_100g ?? null,
          carbs: n.carbohydrates_100g ?? null,
          fat: n.fat_100g ?? null,
          fiber: n.fiber_100g ?? null,
          sugar: n.sugars_100g ?? null,
          satFat: n["saturated-fat_100g"] ?? null,
          sodium: n.sodium_100g != null ? Math.round(n.sodium_100g * 1000) : null,
        },
        source: "off",
      };
    }
  } catch {
    // OFF unavailable: silently fall back to the model estimate.
  }
  return null;
}

// ── Validation (mirrors src/lib/nutrition/math.ts) ────────────────────────

function atwater(item: ModelItem): number {
  return item.protein * 4 + item.carbs * 4 + item.fat * 9;
}

function warningsFor(item: ModelItem): string[] {
  const warnings: string[] = [];
  if (item.kcal > 1500) warnings.push("Very high energy for one item");
  if (item.grams > 1200) warnings.push("Unusually large estimated portion");
  const implied = atwater(item);
  if (implied > 20 && item.kcal > 20) {
    const dev = Math.abs(item.kcal - implied) / Math.max(implied, item.kcal);
    if (dev > 0.25) warnings.push(`Energy differs from macros by ${Math.round(dev * 100)}%`);
  }
  return warnings;
}

function scale(per100g: Record<string, number | null>, grams: number): Record<string, number | null> {
  const f = grams / 100;
  const out: Record<string, number | null> = {};
  for (const [k, v] of Object.entries(per100g)) {
    if (v === null || v === undefined) out[k] = null;
    else out[k] = Math.round(v * f * 10) / 10;
  }
  return out;
}

function confidenceFor(model: string, warnings: string[], grounded: boolean): "low" | "medium" | "high" {
  let score = model === "high" ? 3 : model === "medium" ? 2 : 1;
  if (grounded) score = Math.min(3, score + 1);
  score -= warnings.length;
  return score >= 3 ? "high" : score === 2 ? "medium" : "low";
}

// ── Handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return errorResponse("METHOD", "POST only", 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return errorResponse("AUTH", "Missing bearer token", 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return errorResponse("AUTH", "Invalid token", 401);

  // Entitlement is enforced here on the server, not just in the UI.
  const { data: access } = await supabase.rpc("check_access");
  if (access !== true) return errorResponse("NO_ACCESS", "Active access required", 403);

  // Rate limits: 6 scans/minute, 40/day, enforced from persisted events.
  const serviceRole = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: dayCount } = await serviceRole
    .from("scan_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", dayAgo);
  const { count: minuteCount } = await serviceRole
    .from("scan_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", minuteAgo);
  if ((dayCount ?? 0) >= 40) return errorResponse("RATE_LIMIT", "Daily scan limit reached", 429);
  if ((minuteCount ?? 0) >= 6) return errorResponse("RATE_LIMIT", "Please wait a moment", 429);

  // Input validation.
  let body: { image?: string; hints?: string; mealType?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON", 400);
  }
  const image = body.image ?? "";
  if (
    typeof image !== "string" ||
    !/^data:image\/(jpeg|png|webp);base64,/.test(image) ||
    image.length > MAX_IMAGE_BYTES
  ) {
    return errorResponse("INVALID_IMAGE", "Image must be a jpeg/png/webp data URI under 3 MB", 400);
  }
  const mimeMatch = image.match(/^data:(image\/[a-z]+);base64,(.+)$/s);
  if (!mimeMatch) return errorResponse("INVALID_IMAGE", "Unparseable image", 400);
  const mime = mimeMatch[1];
  const b64 = mimeMatch[2];
  const hints = String(body.hints ?? "").slice(0, 300);

  const startedAt = Date.now();
  let text: string;
  try {
    const userPrompt = hints
      ? `User notes about this meal: "${hints}". Identify items.`
      : "Identify the items in this photo.";
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableKey) text = await callOpenAI(lovableKey, mime, b64, userPrompt, true);
    else if (geminiKey) text = await callGemini(geminiKey, mime, b64, userPrompt);
    else if (openaiKey) text = await callOpenAI(openaiKey, mime, b64, userPrompt);
    else return errorResponse("AI_NOT_CONFIGURED", "No vision provider key is configured on the server", 501);
  } catch (e) {
    return errorResponse("AI_FAILED", String((e as Error).message ?? e), 502);
  }

  const parsed = parseItems(extractJson(text));

  // Ground against the verified database.
  const { data: dbFoods } = await serviceRole
    .from("foods")
    .select("id, name, per100g, source")
    .is("owner_id", null)
    .eq("verified", true)
    .limit(500);
  const dbList: GroundedFood[] = (dbFoods ?? []).map((f: Record<string, unknown>) => ({
    id: String(f.id),
    name: String(f.name),
    per100g: (f.per100g ?? {}) as Record<string, number | null>,
    source: "db",
  }));

  // Ground each item: verified database first, then Open Food Facts for the
  // strongest unmatched items, then the model's own estimate as last resort.
  const matched = parsed.items.map((item) => ({ item, db: bestDbMatch(item.label, dbList) }));

  const unmatchedIdx = matched
    .map((r, i) => (r.db ? -1 : i))
    .filter((i) => i >= 0)
    .slice(0, OFF_MAX_PER_RUN);
  const offResults = await Promise.all(unmatchedIdx.map((i) => searchOff(matched[i].item.label)));
  const offByItemIndex = new Map<number, GroundedFood>();
  unmatchedIdx.forEach((idx, k) => {
    if (offResults[k]) offByItemIndex.set(idx, offResults[k]);
  });

  let groundedCount = 0;

  const results = matched.map(({ item, db }, idx) => {
    const groundedFood = db ?? offByItemIndex.get(idx) ?? null;
    const warnings = warningsFor(item);
    let per100g: Record<string, number | null>;
    let matchedFoodId: string | null = null;
    let grounding: "db" | "ai";

    if (groundedFood) {
      groundedCount += 1;
      per100g = groundedFood.per100g;
      matchedFoodId = groundedFood.id || null;
      grounding = "db";
    } else {
      // Model estimate only: derive per-100g from the model macros so the
      // portion stays user-editable with consistent recalculation.
      const g = Math.max(item.grams, 1);
      per100g = {
        kcal: Math.round((item.kcal / g) * 100),
        protein: Math.round((item.protein / g) * 1000) / 10,
        carbs: Math.round((item.carbs / g) * 1000) / 10,
        fat: Math.round((item.fat / g) * 1000) / 10,
      };
      grounding = "ai";
    }

    return {
      label: groundedFood ? groundedFood.name : item.label,
      grams: item.grams,
      per100g,
      nutrients: scale(per100g, item.grams),
      confidence: confidenceFor(item.confidence, warnings, grounding === "db"),
      grounding,
      matchScore: groundedFood ? Math.round(matchScore(item.label, groundedFood.name) * 100) / 100 : 0,
      matchedFoodId,
      warnings,
    };
  });

  const confRank = { high: 3, medium: 2, low: 1 } as const;
  const minRank = results.length
    ? Math.min(...results.map((r) => confRank[r.confidence]))
    : 1;
  const overall: "low" | "medium" | "high" = minRank >= 3 ? "high" : minRank === 2 ? "medium" : "low";

  // Persist telemetry (no image data is ever stored).
  await serviceRole.from("scan_events").insert({
    user_id: user.id,
    provider: Deno.env.get("LOVABLE_API_KEY") ? "lovable" : Deno.env.get("GEMINI_API_KEY") ? "gemini" : "openai",
    item_count: results.length,
    grounded_count: groundedCount,
    overall_confidence: overall,
    latency_ms: Date.now() - startedAt,
  });

  return json({
    items: results,
    overallConfidence: overall,
    notes: parsed.notes,
    attribution: groundedCount > 0 ? "Values grounded against verified food data; Open Food Facts (ODbL) used where marked." : null,
  });
});

export {};
