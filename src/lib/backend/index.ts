import { IS_SUPABASE_CONFIGURED } from "@/lib/supabase";
import { supabaseBackend } from "./supabase-backend";
import { demoBackend } from "./demo-backend";
import type { Backend } from "./types";

/** True when no Supabase credentials are configured: the app runs in
 *  clearly-labeled demo mode with local data only. */
export const IS_DEMO = !IS_SUPABASE_CONFIGURED;

export const backend: Backend = IS_DEMO ? demoBackend : supabaseBackend;

export { BackendError } from "./types";
export type { Backend, FoodSearchHit, AddEntryInput, CustomFoodInput, RecipeInput } from "./types";

// ── Data version store ────────────────────────────────────────────────────
// Screens subscribe to this counter so a mutation anywhere refreshes any
// view that depends on it. Deliberately simple: no query library needed.
let version = 0;
const listeners = new Set<() => void>();

export function bumpData(): void {
  version += 1;
  for (const l of listeners) l();
}

export function subscribeData(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDataVersion(): number {
  return version;
}
