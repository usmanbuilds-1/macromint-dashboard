// User-requested complete export, including after trial expiry or revocation.
// The service role NEVER accepts a target user ID: all reads are scoped to
// the validated bearer-token identity. No export runs automatically.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { json, errorResponse, preflight, readJsonObject } from "../_shared/http.ts";

type Spec = { key: string; table: string; ownerColumn: "user_id" | "owner_id"; order: string };
const OWNED_TABLES: Spec[] = [
  { key:"profile",table:"profiles",ownerColumn:"user_id",order:"user_id" },
  { key:"goals",table:"nutritional_goals",ownerColumn:"user_id",order:"user_id" },
  { key:"preferences",table:"user_preferences",ownerColumn:"user_id",order:"user_id" },
  { key:"customFoods",table:"foods",ownerColumn:"owner_id",order:"id" },
  { key:"diary",table:"diary_entries",ownerColumn:"user_id",order:"id" },
  { key:"savedMeals",table:"saved_meals",ownerColumn:"user_id",order:"id" },
  { key:"recipes",table:"recipes",ownerColumn:"user_id",order:"id" },
  { key:"weightEntries",table:"weight_entries",ownerColumn:"user_id",order:"id" },
  { key:"waterEntries",table:"water_entries",ownerColumn:"user_id",order:"id" },
  { key:"favorites",table:"favorites",ownerColumn:"user_id",order:"id" },
  { key:"entitlements",table:"entitlements",ownerColumn:"user_id",order:"user_id" },
  { key:"trialRecords",table:"trial_records",ownerColumn:"user_id",order:"id" },
  { key:"subscriptions",table:"subscriptions",ownerColumn:"user_id",order:"id" },
  { key:"payments",table:"payments",ownerColumn:"user_id",order:"id" },
  { key:"scanCorrections",table:"scan_corrections",ownerColumn:"user_id",order:"id" },
  { key:"scanEvents",table:"scan_events",ownerColumn:"user_id",order:"id" },
  { key:"rewardedAdEvents",table:"rewarded_ad_events",ownerColumn:"user_id",order:"id" },
  { key:"consents",table:"user_consents",ownerColumn:"user_id",order:"id" },
  { key:"notifications",table:"notifications",ownerColumn:"user_id",order:"id" },
];

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== "POST") return errorResponse("METHOD", "POST only", 405);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /i, "");
  if (!token) return errorResponse("AUTH", "Sign in required", 401);
  const raw = await readJsonObject(req);
  if (!raw || raw.action !== "export") return errorResponse("INPUT", "Invalid export action", 400);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return errorResponse("CONFIG", "Export service unavailable", 503);
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: auth, error: authError } = await sb.auth.getUser(token);
  if (authError || !auth.user) return errorResponse("AUTH", "Invalid session", 401);
  const userId = auth.user.id;

  // Always request all pages. Supabase may impose a 1000-row per-call limit.
  // Throw rather than deliver an incomplete export after any read failure.
  const page = async (
    table: string, column: string, id: string, order: string,
  ): Promise<Record<string, unknown>[]> => {
    const rows: Record<string, unknown>[] = [];
    const step = 500;
    for (let index = 0; index < 200; index++) {
      const { data, error } = await sb.from(table).select("*")
        .eq(column, id).order(order).range(index*step, index*step+step-1);
      if (error || !data) throw new Error("Export collection unavailable");
      rows.push(...(data as Record<string, unknown>[]));
      if (data.length < step) return rows;
    }
    throw new Error("Export exceeds supported page limit; contact support");
  };

  try {
    const exportPayload: Record<string, unknown> = {
      exportedAt: new Date().toISOString(), formatVersion: 2,
    };
    // Sequential reads bound memory and database connection load.
    for (const spec of OWNED_TABLES) {
      exportPayload[spec.key] = await page(spec.table,spec.ownerColumn,userId,spec.order);
    }
    const recipes = exportPayload.recipes as Array<{id: string}>;
    const recipeIngredients: Record<string, unknown>[] = [];
    for (let i=0; i<recipes.length; i+=50) {
      const ids = recipes.slice(i,i+50).map((r) => r.id);
      for (let offset=0; offset<100000; offset+=500) {
        const { data, error } = await sb.from("recipe_ingredients").select("*")
          .in("recipe_id",ids).order("id").range(offset,offset+499);
        if (error || !data) throw new Error("Could not export recipe ingredients");
        recipeIngredients.push(...(data as Record<string, unknown>[]));
        if (data.length < 500) break;
        if (offset>=99500) throw new Error("Recipe export exceeds supported page limit");
      }
    }
    exportPayload.recipeIngredients = recipeIngredients;
    // Exclude private audit reasons, recovery-code hashes and secret material.
    const { data: appeals, error: appealError } = await sb.from("beta_reactivation_requests")
      .select("id,status,message,created_at,reviewed_at,approved_days")
      .eq("user_id",userId).order("created_at",{ascending:false}).limit(500);
    if (appealError) throw new Error("Could not export access requests");
    exportPayload.reactivationRequests = appeals ?? [];

    return json(exportPayload);
  } catch {
    return errorResponse("EXPORT_FAILED", "A complete export could not be produced. Try again or contact support.", 503);
  }
});
