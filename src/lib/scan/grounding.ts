// ── Scan grounding (client-side, used in demo/local mode) ─────────────────
// Production grounding happens inside the ai-scan Edge Function. In demo
// mode the food database lives in the browser, so the same pipeline runs
// here: database match → Open Food Facts fallback → validation + confidence.

import { searchOffClient } from "./off-client";
import type { Food, ScanItem } from "@/types";

export interface RawModelItem {
  label: string;
  grams: number;
  confidence: "low" | "medium" | "high";
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

const MATCH_THRESHOLD = 0.55;

function tokenize(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((t) => t.length > 2));
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

function bestDbMatch(label: string, foods: Food[]): Food | null {
  let best: Food | null = null;
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

function scale(per100g: Record<string, number | null>, grams: number): Record<string, number | null> {
  const f = grams / 100;
  const out: Record<string, number | null> = {};
  for (const [k, v] of Object.entries(per100g)) {
    out[k] = v == null ? null : Math.round(v * f * 10) / 10;
  }
  return out;
}

function warningsFor(item: RawModelItem): string[] {
  const warnings: string[] = [];
  if (item.kcal > 1500) warnings.push("Very high energy for one item");
  if (item.grams > 1200) warnings.push("Unusually large estimated portion");
  const implied = item.protein * 4 + item.carbs * 4 + item.fat * 9;
  if (implied > 20 && item.kcal > 20) {
    const dev = Math.abs(item.kcal - implied) / Math.max(implied, item.kcal);
    if (dev > 0.25) warnings.push(`Energy differs from macros by ${Math.round(dev * 100)}%`);
  }
  return warnings;
}

function confidenceFor(model: string, warnings: string[], grounded: boolean): ScanItem["confidence"] {
  let score = model === "high" ? 3 : model === "medium" ? 2 : 1;
  if (grounded) score = Math.min(3, score + 1);
  score -= warnings.length;
  return score >= 3 ? "high" : score === 2 ? "medium" : "low";
}

export async function groundScanItems(rawItems: RawModelItem[], foods: Food[]): Promise<ScanItem[]> {
  const unmatched = rawItems.filter((item) => !bestDbMatch(item.label, foods)).slice(0, 3);
  const offResults = await Promise.all(unmatched.map((item) => searchOffClient(item.label)));
  const offByLabel = new Map<string, Awaited<ReturnType<typeof searchOffClient>>>();
  unmatched.forEach((item, i) => offByLabel.set(item.label, offResults[i]));

  return rawItems.map((item) => {
    const db = bestDbMatch(item.label, foods);
    const off = db ? null : offByLabel.get(item.label) ?? null;
    const warnings = warningsFor(item);

    if (db) {
      return {
        label: db.name,
        grams: item.grams,
        per100g: db.per100g,
        nutrients: scale(db.per100g as Record<string, number | null>, item.grams),
        confidence: confidenceFor(item.confidence, warnings, true),
        grounding: "db",
        matchScore: Math.round(matchScore(item.label, db.name) * 100) / 100,
        matchedFoodId: db.id,
        warnings,
      };
    }
    if (off) {
      return {
        label: off.name,
        grams: item.grams,
        per100g: off.per100g,
        nutrients: scale(off.per100g as Record<string, number | null>, item.grams),
        confidence: confidenceFor(item.confidence, warnings, true),
        grounding: "db",
        matchScore: 0.5,
        matchedFoodId: null,
        warnings,
      };
    }
    const g = Math.max(item.grams, 1);
    const per100g = {
      kcal: Math.round((item.kcal / g) * 100),
      protein: Math.round((item.protein / g) * 1000) / 10,
      carbs: Math.round((item.carbs / g) * 1000) / 10,
      fat: Math.round((item.fat / g) * 1000) / 10,
    };
    return {
      label: item.label,
      grams: item.grams,
      per100g,
      nutrients: scale(per100g, item.grams),
      confidence: confidenceFor(item.confidence, warnings, false),
      grounding: "ai",
      matchScore: 0,
      matchedFoodId: null,
      warnings,
    };
  });
}
