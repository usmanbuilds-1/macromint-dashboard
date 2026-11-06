import type { TablesUpdate, Json } from "@/integrations/supabase/types";
// ── Production backend: Supabase ──────────────────────────────────────────
// Maps the Backend contract onto RLS-protected tables and Edge Functions.
// Ownership and access are re-checked by the database on every call.

import { BackendError } from "./types";
import { USERNAME_AUTH_ENABLED } from "@/lib/auth/username-config";
import { isValidInviteCode } from "@/lib/beta/invite-code";
import {
  isValidUsername,
  canonicalUsername,
  identifierToAuthEmail,
  usernameFromAuthEmail,
} from "@/lib/auth/username";
import type {
  Backend,
  AddEntryInput,
  AdminActionInput,
  ReactivationRequest,
  AdminReactivationRequest,
  CustomFoodInput,
  FoodSearchHit,
  RecipeInput,
} from "./types";
import { getSupabase, mapFoodRow } from "@/lib/supabase";
import { applyPortionPercent, sumNutrients } from "@/lib/nutrition/math";
import type {
  AdminUserRow,
  AppSettings,
  AuditLogEntry,
  DiaryEntry,
  Entitlement,
  Favorite,
  Food,
  GoalSet,
  MealType,
  NotificationItem,
  NutrientRecord,
  Profile,
  Recipe,
  RecipeIngredient,
  SavedMeal,
  UserPreferences,
  WaterEntry,
  WeightEntry,
} from "@/types";

async function currentUserId(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  if (!data.session?.user.id) throw new BackendError("AUTH", "Please sign in again");
  return data.session.user.id;
}

function n(v: unknown): number {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

function mapEntry(row: Record<string, unknown>): DiaryEntry {
  return {
    id: String(row["id"]),
    userId: String(row["user_id"]),
    entryDate: String(row["entry_date"]),
    mealType: row["meal_type"] as DiaryEntry["mealType"],
    foodId: (row["food_id"] as string | null) ?? null,
    recipeId: (row["recipe_id"] as string | null) ?? null,
    name: String(row["name"]),
    brand: (row["brand"] as string | null) ?? null,
    grams: n(row["grams"]),
    portionPercent: n(row["portion_percent"]),
    baseNutrients: (row["base_nutrients"] ?? {}) as NutrientRecord,
    nutrients: (row["nutrients"] ?? {}) as NutrientRecord,
    source: row["source"] as DiaryEntry["source"],
    loggedAt: String(row["logged_at"] ?? ""),
  };
}

export const supabaseBackend: Backend = {
  // ── Auth ────────────────────────────────────────────────────────────────
  async getSessionUser() {
    const { data } = await getSupabase().auth.getSession();
    const u = data.session?.user;
    if (!u) return null;
    const username = usernameFromAuthEmail(u.email) ?? (
      typeof u.user_metadata?.["username"] === "string" && isValidUsername(u.user_metadata["username"])
        ? canonicalUsername(u.user_metadata["username"]) : undefined
    );
    return {
      id: u.id, email: u.email ?? "", emailVerified: Boolean(u.email_confirmed_at),
      ...(username ? { username } : {}),
    };
  },

  async signIn(identifier, password) {
    let email: string;
    try {
      email = USERNAME_AUTH_ENABLED ? identifierToAuthEmail(identifier) : identifier.trim().toLowerCase();
    } catch {
      throw new BackendError("VALIDATION", "Enter a valid username or account email");
    }
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw new BackendError("AUTH", "Invalid login credentials");
  },

  async signUp(identifier, password, name, inviteCode) {
    if (inviteCode?.trim() && !isValidInviteCode(inviteCode)) {
      throw new BackendError("INVITE", "Enter a valid beta invitation code or leave the field blank");
    }
    if (USERNAME_AUTH_ENABLED) {
      if (!isValidUsername(identifier)) {
        throw new BackendError("VALIDATION", "Username must be 3–20 letters, numbers, or underscores");
      }
      if (password.length < 12) {
        throw new BackendError("VALIDATION", "Password must contain at least 12 characters");
      }
      const { data, error } = await getSupabase().functions.invoke<{ needsVerification: boolean; recoveryCodes: string[]; error?: string }>(
        "username-register",
        { body: { username: canonicalUsername(identifier), name: name.trim(), password, ...(inviteCode.trim() ? { inviteCode: inviteCode.trim() } : {}) } },
      );
      if (error || !data || data.error) {
        throw new BackendError("AUTH", "Could not create account. Check your username or try again later.");
      }
      if (!Array.isArray(data.recoveryCodes) || data.recoveryCodes.length !== 8 ||
          !data.recoveryCodes.every(code => /^MMR-(?:[A-F0-9]{8}-){3}[A-F0-9]{8}$/.test(code))) {
        throw new BackendError("AUTH", "Account recovery was not prepared. Contact the beta administrator.");
      }
      // Do NOT auto-login: first show the codes once and require acknowledgement.
      return { needsVerification: false, recoveryCodes: data.recoveryCodes };
    }
    const { data, error } = await getSupabase().auth.signUp({
      email: identifier.trim(),
      password,
      options: { data: { name, beta_invite_code: inviteCode.trim() } },
    });
    if (error) throw new BackendError("AUTH", error.message);
    return { needsVerification: !data.session };
  },

  async signOut() {
    await getSupabase().auth.signOut();
  },

  async requestPasswordReset(email) {
    if (USERNAME_AUTH_ENABLED && !email.includes("@")) {
      throw new BackendError("RECOVERY_UNAVAILABLE", "Username accounts cannot receive reset emails. Contact your beta administrator for recovery.");
    }
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: new URL("/reset?change=1", window.location.origin).href,
    });
    if (error) throw new BackendError("AUTH", error.message);
  },

  async recoverUsernamePassword(username, recoveryCode, newPassword) {
    if (!USERNAME_AUTH_ENABLED) throw new BackendError("RECOVERY_UNAVAILABLE", "Username recovery is disabled");
    if (!isValidUsername(username) || newPassword.length < 12) {
      throw new BackendError("VALIDATION", "Enter a valid username and a new password of at least 12 characters");
    }
    const { data, error } = await getSupabase().functions.invoke<{ ok?: boolean; error?: string }>(
      "username-recovery",
      { body: { username: canonicalUsername(username), recoveryCode: recoveryCode.trim(), newPassword } },
    );
    if (error || !data?.ok) {
      throw new BackendError("AUTH", "Recovery failed. Check your unused code or contact the beta administrator.");
    }
  },

  async resendVerification() {
    const { data } = await getSupabase().auth.getSession();
    const email = data.session?.user?.email;
    if (!email) throw new BackendError("AUTH", "Not signed in");
    if (usernameFromAuthEmail(email)) throw new BackendError("RECOVERY_UNAVAILABLE", "Synthetic usernames cannot receive verification mail");
    const { error } = await getSupabase().auth.resend({ type: "signup", email });
    if (error) throw new BackendError("AUTH", error.message);
  },

  onAuthChange(cb) {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      const username = usernameFromAuthEmail(u?.email);
      cb(u ? {
        id: u.id, email: u.email ?? "", emailVerified: Boolean(u.email_confirmed_at),
        ...(username ? { username } : {}),
      } : null);
    });
    return () => data.subscription.unsubscribe();
  },

  async deleteAccount() {
    const { error } = await getSupabase().functions.invoke("delete-account");
    if (error) throw new BackendError("SERVER", error.message);
  },

  // ── Profile, goals, preferences ─────────────────────────────────────────
  async getProfile() {
    const { data, error } = await getSupabase()
      .from("profiles")
      .select("*")
      .eq("user_id", await currentUserId())
      .maybeSingle();
    if (error) throw new BackendError("DB", error.message);
    if (!data) return null;
    return {
      userId: String(data.user_id),
      email: String(data.email ?? ""),
      ...(usernameFromAuthEmail(String(data.email ?? "")) ? { username: usernameFromAuthEmail(String(data.email ?? ""))! } : {}),
      name: String(data.name ?? ""),
      sex: (data.sex as Profile["sex"]) ?? null,
      birthYear: (data.birth_year as number | null) ?? null,
      heightCm: data.height_cm != null ? n(data.height_cm) : null,
      weightKg: data.weight_kg != null ? n(data.weight_kg) : null,
      targetWeightKg: data.target_weight_kg != null ? n(data.target_weight_kg) : null,
      activityLevel: (data.activity_level as Profile["activityLevel"]) ?? null,
      objective: (data.objective as Profile["objective"]) ?? null,
      units: (data.units as Profile["units"]) ?? "metric",
      onboardedAt: (data.onboarded_at as string | null) ?? null,
    };
  },

  async updateProfile(patch) {
    const col: TablesUpdate<"profiles"> = {};
    if (patch.name !== undefined) col.name = patch.name;
    if (patch.sex !== undefined) col.sex = patch.sex;
    if (patch.birthYear !== undefined) col.birth_year = patch.birthYear;
    if (patch.heightCm !== undefined) col.height_cm = patch.heightCm;
    if (patch.weightKg !== undefined) col.weight_kg = patch.weightKg;
    if (patch.targetWeightKg !== undefined) col.target_weight_kg = patch.targetWeightKg;
    if (patch.activityLevel !== undefined) col.activity_level = patch.activityLevel;
    if (patch.objective !== undefined) col.objective = patch.objective;
    if (patch.units !== undefined) col.units = patch.units;
    if (patch.onboardedAt !== undefined) col.onboarded_at = patch.onboardedAt;
    const { data, error } = await getSupabase()
      .from("profiles")
      .update(col)
      .eq("user_id", await currentUserId())
      .select()
      .maybeSingle();
    if (error) throw new BackendError("DB", error.message);
    const full = await supabaseBackend.getProfile();
    void data;
    return full!;
  },

  async getGoals() {
    const { data, error } = await getSupabase()
      .from("nutritional_goals")
      .select("*")
      .eq("user_id", await currentUserId())
      .maybeSingle();
    if (error) throw new BackendError("DB", error.message);
    if (!data) return null;
    return {
      userId: String(data.user_id),
      calorieTarget: n(data.calorie_target),
      proteinG: n(data.protein_g),
      carbsG: n(data.carbs_g),
      fatG: n(data.fat_g),
      fiberG: n(data.fiber_g),
      waterMl: n(data.water_ml),
      method: String(data.method ?? "manual"),
      manuallyAdjusted: Boolean(data.manually_adjusted),
    };
  },

  async saveGoals(goals) {
    const patch: TablesUpdate<"nutritional_goals"> = {};
    if (goals.calorieTarget !== undefined) patch.calorie_target = goals.calorieTarget;
    if (goals.proteinG !== undefined) patch.protein_g = goals.proteinG;
    if (goals.carbsG !== undefined) patch.carbs_g = goals.carbsG;
    if (goals.fatG !== undefined) patch.fat_g = goals.fatG;
    if (goals.fiberG !== undefined) patch.fiber_g = goals.fiberG;
    if (goals.waterMl !== undefined) patch.water_ml = goals.waterMl;
    if (goals.method !== undefined) patch.method = goals.method;
    if (goals.manuallyAdjusted !== undefined) patch.manually_adjusted = goals.manuallyAdjusted;
    const { error } = await getSupabase()
      .from("nutritional_goals")
      .update(patch)
      .eq("user_id", await currentUserId());
    if (error) throw new BackendError("DB", error.message);
    const full = await supabaseBackend.getGoals();
    if (!full) throw new BackendError("DB", "Goals missing after save");
    return full;
  },

  async getPreferences() {
    const { data, error } = await getSupabase()
      .from("user_preferences")
      .select("*")
      .eq("user_id", await currentUserId())
      .maybeSingle();
    if (error) throw new BackendError("DB", error.message);
    if (!data) throw new BackendError("DB", "Preferences missing");
    return {
      userId: String(data.user_id),
      weekStart: n(data.week_start),
      reminders: (data.reminders ?? {}) as Record<string, unknown>,
      adConsent: Boolean(data.ad_consent),
      analyticsConsent: Boolean(data.analytics_consent),
    };
  },

  async savePreferences(patch) {
    const col: TablesUpdate<"user_preferences"> = {};
    if (patch.weekStart !== undefined) col.week_start = patch.weekStart;
    if (patch.reminders !== undefined)
      col.reminders = JSON.parse(JSON.stringify(patch.reminders)) as Json;
    if (patch.adConsent !== undefined) col.ad_consent = patch.adConsent;
    if (patch.analyticsConsent !== undefined) col.analytics_consent = patch.analyticsConsent;
    const { error } = await getSupabase()
      .from("user_preferences")
      .update(col)
      .eq("user_id", await currentUserId());
    if (error) throw new BackendError("DB", error.message);
    return supabaseBackend.getPreferences();
  },

  // ── Foods ───────────────────────────────────────────────────────────────
  async searchFoods(q) {
    const { data, error } = await getSupabase().functions.invoke("food-search", { body: { q } });
    if (error) throw new BackendError("SERVER", error.message);
    return {
      local: ((data.local ?? []) as Record<string, unknown>[]).map(mapFoodRow),
      remote: (data.remote ?? []) as FoodSearchHit["remote"],
      attribution: data.attribution ?? null,
      warning: data.warning,
    };
  },

  async lookupBarcode(barcode) {
    const { data, error } = await getSupabase().functions.invoke("food-search", {
      body: { barcode },
    });
    if (error) throw new BackendError("SERVER", error.message);
    return {
      local: ((data.local ?? []) as Record<string, unknown>[]).map(mapFoodRow),
      remote: (data.remote ?? []) as FoodSearchHit["remote"],
      attribution: data.attribution ?? null,
    };
  },

  async createCustomFood(input: CustomFoodInput) {
    const { data, error } = await getSupabase()
      .from("foods")
      .insert({
        owner_id: await currentUserId(),
        name: input.name,
        brand: input.brand ?? null,
        category: input.category ?? null,
        source: "custom",
        verified: false,
        per100g: input.per100g,
        serving_label: input.servingLabel ?? "100 g",
        serving_grams: input.servingGrams ?? 100,
      })
      .select()
      .single();
    if (error) throw new BackendError("DB", error.message);
    return mapFoodRow(data as Record<string, unknown>);
  },

  async getFavorites() {
    const { data, error } = await getSupabase()
      .from("favorites")
      .select("id, food_id, created_at, food:foods(*)")
      .order("created_at", { ascending: false });
    if (error) throw new BackendError("DB", error.message);
    return (data ?? []).map((row) => {
      const r = row as unknown as {
        id: string;
        food_id: string;
        created_at: string;
        food: Record<string, unknown> | null;
      };
      return {
        id: r.id,
        userId: "",
        foodId: r.food_id,
        createdAt: r.created_at,
        food: mapFoodRow(r.food ?? {}),
      };
    });
  },

  async toggleFavorite(foodId) {
    const { data: existing } = await getSupabase()
      .from("favorites")
      .select("id")
      .eq("food_id", foodId)
      .maybeSingle();
    if (existing) {
      await getSupabase().from("favorites").delete().eq("id", String(existing.id));
      return false;
    }
    const { error } = await getSupabase()
      .from("favorites")
      .insert({ user_id: await currentUserId(), food_id: foodId });
    if (error) throw new BackendError("DB", error.message);
    return true;
  },

  async getRecentEntries(limit) {
    const { data, error } = await getSupabase()
      .from("diary_entries")
      .select("*")
      .order("logged_at", { ascending: false })
      .limit(limit);
    if (error) throw new BackendError("DB", error.message);
    return (data ?? []).map(mapEntry);
  },

  async saveMeal(name, entryIds) {
    const { data: entries, error } = await getSupabase()
      .from("diary_entries")
      .select("*")
      .in("id", entryIds);
    if (error) throw new BackendError("DB", error.message);
    const items = (entries ?? []).map((e) => {
      const row = e as Record<string, unknown>;
      return {
        foodId: (row["food_id"] as string | null) ?? null,
        name: String(row["name"]),
        brand: (row["brand"] as string | null) ?? null,
        grams: n(row["grams"]),
        per100g: scaleBackToPer100g(
          (row["base_nutrients"] ?? {}) as NutrientRecord,
          n(row["grams"]),
        ),
      };
    });
    const { data: saved, error: insertError } = await getSupabase()
      .from("saved_meals")
      .insert({ user_id: await currentUserId(), name, items })
      .select()
      .single();
    if (insertError) throw new BackendError("DB", insertError.message);
    return {
      id: String(saved.id),
      userId: String(saved.user_id),
      name: String(saved.name),
      items,
      createdAt: String(saved.created_at),
    };
  },

  async getSavedMeals() {
    const { data, error } = await getSupabase()
      .from("saved_meals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new BackendError("DB", error.message);
    return (data ?? []).map((s) => {
      const row = s as Record<string, unknown>;
      return {
        id: String(row["id"]),
        userId: String(row["user_id"]),
        name: String(row["name"]),
        items: (row["items"] ?? []) as SavedMeal["items"],
        createdAt: String(row["created_at"]),
      };
    });
  },

  async logSavedMeal(id, entryDate, mealType) {
    const meals = await supabaseBackend.getSavedMeals();
    const meal = meals.find((m) => m.id === id);
    if (!meal) throw new BackendError("NOT_FOUND", "Saved meal not found");
    for (const item of meal.items) {
      const base = applyPortionPercent(scaleToBase(item.per100g, item.grams), 100);
      await supabaseBackend.addEntry({
        entryDate,
        mealType,
        foodId: item.foodId,
        name: item.name,
        brand: item.brand,
        grams: item.grams,
        portionPercent: 100,
        baseNutrients: base,
        source: "favorite",
      });
    }
  },

  // ── Diary ───────────────────────────────────────────────────────────────
  async getDiary(entryDate) {
    const { data, error } = await getSupabase()
      .from("diary_entries")
      .select("*")
      .eq("entry_date", entryDate)
      .order("logged_at", { ascending: true });
    if (error) throw new BackendError("DB", error.message);
    return (data ?? []).map(mapEntry);
  },

  async addEntry(input: AddEntryInput) {
    const nutrients = applyPortionPercent(input.baseNutrients, input.portionPercent);
    const { data, error } = await getSupabase()
      .from("diary_entries")
      .insert({
        user_id: await currentUserId(),
        entry_date: input.entryDate,
        meal_type: input.mealType,
        food_id: input.foodId ?? null,
        recipe_id: input.recipeId ?? null,
        name: input.name,
        brand: input.brand ?? null,
        grams: input.grams,
        portion_percent: input.portionPercent,
        base_nutrients: input.baseNutrients,
        nutrients,
        source: input.source,
      })
      .select()
      .single();
    if (error) {
      if (error.code === "42501") throw new BackendError("NO_ACCESS", "Active access required");
      throw new BackendError("DB", error.message);
    }
    return mapEntry(data as Record<string, unknown>);
  },

  async updateEntry(id, patch) {
    const col: TablesUpdate<"diary_entries"> = {};
    if (patch.grams !== undefined) col.grams = patch.grams;
    if (patch.mealType !== undefined) col.meal_type = patch.mealType;
    if (patch.name !== undefined) col.name = patch.name;
    if (patch.baseNutrients !== undefined) col.base_nutrients = patch.baseNutrients;
    if (patch.portionPercent !== undefined) col.portion_percent = patch.portionPercent;
    if (Object.keys(col).length) {
      const { data: current, error: fetchError } = await getSupabase()
        .from("diary_entries")
        .select("base_nutrients, portion_percent, grams")
        .eq("id", id)
        .single();
      if (fetchError) throw new BackendError("DB", fetchError.message);
      const base =
        patch.baseNutrients ?? (current as { base_nutrients: NutrientRecord }).base_nutrients;
      const pct = patch.portionPercent ?? (current as { portion_percent: number }).portion_percent;
      col.base_nutrients = base;
      col.portion_percent = pct;
      col.nutrients = applyPortionPercent(base, pct);
    }
    const { data, error } = await getSupabase()
      .from("diary_entries")
      .update(col)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new BackendError("DB", error.message);
    return mapEntry(data as Record<string, unknown>);
  },

  async deleteEntry(id) {
    const { error } = await getSupabase().from("diary_entries").delete().eq("id", id);
    if (error) throw new BackendError("DB", error.message);
  },

  async copyDay(fromDate, toDate) {
    const entries = await supabaseBackend.getDiary(fromDate);
    for (const e of entries) {
      await supabaseBackend.addEntry({
        entryDate: toDate,
        mealType: e.mealType,
        foodId: e.foodId,
        recipeId: e.recipeId,
        name: e.name,
        brand: e.brand,
        grams: e.grams,
        portionPercent: e.portionPercent,
        baseNutrients: e.baseNutrients,
        source: e.source,
      });
    }
    return entries.length;
  },

  // ── Recipes ─────────────────────────────────────────────────────────────
  async getRecipes() {
    const { data, error } = await getSupabase()
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new BackendError("DB", error.message);
    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row["id"]),
        userId: String(row["user_id"]),
        name: String(row["name"]),
        servings: n(row["servings"]) || 1,
        notes: (row["notes"] as string | null) ?? null,
        createdAt: String(row["created_at"]),
      };
    });
  },

  async getRecipeIngredients(recipeId) {
    const { data, error } = await getSupabase()
      .from("recipe_ingredients")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("position", { ascending: true });
    if (error) throw new BackendError("DB", error.message);
    return (data ?? []).map((i) => {
      const row = i as Record<string, unknown>;
      return {
        id: String(row["id"]),
        recipeId: String(row["recipe_id"]),
        foodId: (row["food_id"] as string | null) ?? null,
        name: String(row["name"]),
        grams: n(row["grams"]),
        per100g: (row["per100g"] ?? {}) as NutrientRecord,
      };
    });
  },

  async createRecipe(input: RecipeInput) {
    const { data: recipe, error } = await getSupabase()
      .from("recipes")
      .insert({
        user_id: await currentUserId(),
        name: input.name,
        servings: input.servings,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw new BackendError("DB", error.message);
    const recipeId = String(recipe.id);
    const rows = input.ingredients.map((ing, idx) => ({
      recipe_id: recipeId,
      food_id: ing.foodId ?? null,
      name: ing.name,
      grams: ing.grams,
      per100g: ing.per100g,
      position: idx,
    }));
    const { error: ingError } = await getSupabase().from("recipe_ingredients").insert(rows);
    if (ingError) {
      await getSupabase().from("recipes").delete().eq("id", recipeId);
      throw new BackendError("DB", ingError.message);
    }
    return {
      id: recipeId,
      userId: String(recipe.user_id),
      name: input.name,
      servings: input.servings,
      notes: input.notes ?? null,
      createdAt: String(recipe.created_at),
    };
  },

  async deleteRecipe(id) {
    const { error } = await getSupabase().from("recipes").delete().eq("id", id);
    if (error) throw new BackendError("DB", error.message);
  },

  async logRecipe(recipeId, entryDate, mealType, servings) {
    const recipes = await supabaseBackend.getRecipes();
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) throw new BackendError("NOT_FOUND", "Recipe not found");
    const ingredients = await supabaseBackend.getRecipeIngredients(recipeId);
    const total = sumNutrients(
      ingredients.map((i) => applyPortionPercent(scaleToBase(i.per100g, i.grams), 100)),
    );
    const perServing = applyPortionPercent(total, (servings / recipe.servings) * 100);
    return supabaseBackend.addEntry({
      entryDate,
      mealType,
      recipeId,
      name: recipe.name,
      grams: 100 * servings,
      portionPercent: 100,
      baseNutrients: perServing,
      source: "recipe",
    });
  },

  // ── Body measurements ───────────────────────────────────────────────────
  async getWeights(limit) {
    const { data, error } = await getSupabase()
      .from("weight_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .limit(limit);
    if (error) throw new BackendError("DB", error.message);
    return (data ?? []).map((w) => {
      const row = w as Record<string, unknown>;
      return {
        id: String(row["id"]),
        userId: String(row["user_id"]),
        entryDate: String(row["entry_date"]),
        weightKg: n(row["weight_kg"]),
        note: (row["note"] as string | null) ?? null,
        createdAt: String(row["created_at"]),
      };
    });
  },

  async addWeight(entryDate, weightKg, note) {
    const { data, error } = await getSupabase()
      .from("weight_entries")
      .upsert(
        {
          user_id: await currentUserId(),
          entry_date: entryDate,
          weight_kg: weightKg,
          note: note ?? null,
        },
        { onConflict: "user_id,entry_date" },
      )
      .select()
      .single();
    if (error) throw new BackendError("DB", error.message);
    const row = data as Record<string, unknown>;
    return {
      id: String(row["id"]),
      userId: String(row["user_id"]),
      entryDate: String(row["entry_date"]),
      weightKg: n(row["weight_kg"]),
      note: (row["note"] as string | null) ?? null,
      createdAt: String(row["created_at"]),
    };
  },

  async deleteWeight(id) {
    const { error } = await getSupabase().from("weight_entries").delete().eq("id", id);
    if (error) throw new BackendError("DB", error.message);
  },

  async getWater(entryDate) {
    const { data, error } = await getSupabase()
      .from("water_entries")
      .select("*")
      .eq("entry_date", entryDate)
      .order("created_at", { ascending: true });
    if (error) throw new BackendError("DB", error.message);
    return (data ?? []).map((w) => {
      const row = w as Record<string, unknown>;
      return {
        id: String(row["id"]),
        userId: String(row["user_id"]),
        entryDate: String(row["entry_date"]),
        amountMl: n(row["amount_ml"]),
        createdAt: String(row["created_at"]),
      };
    });
  },

  async addWater(entryDate, amountMl) {
    const { error } = await getSupabase()
      .from("water_entries")
      .insert({ user_id: await currentUserId(), entry_date: entryDate, amount_ml: amountMl });
    if (error) throw new BackendError("DB", error.message);
  },

  // ── Entitlement, settings ───────────────────────────────────────────────
  async getEntitlement() {
    const { data, error } = await getSupabase().rpc("my_entitlement");
    if (error) throw new BackendError("DB", error.message);
    const row = (data as Record<string, unknown>[] | null)?.[0];
    if (!row) return null;
    return {
      userId: String(row["user_id"]),
      state: row["state"] as Entitlement["state"],
      trialStartedAt: String(row["trial_started_at"]),
      trialEndsAt: String(row["trial_ends_at"]),
      accessUntil: (row["access_until"] as string | null) ?? null,
      updatedAt: String(row["updated_at"]),
    };
  },

  async getPublicSettings() {
    const sb = getSupabase();
    // Public beta clients need only these three non-personal settings.
    // Avoid direct reads of the full, admin-controlled app_settings table.
    const { data: config, error } = await sb.rpc("get_public_app_settings");
    if (!error) {
      if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new BackendError("DB", "Application settings are unavailable");
      }
      return {
        trialDays: n(config.trial_days),
        rewardAccessHours: n(config.reward_access_hours),
        maxDailyRewardedAds: n(config.max_daily_rewarded_ads),
      };
    }

    // Rollout compatibility: older Cloud databases do not yet have the RPC.
    // Never hide a permission failure or server error behind fake defaults.
    if (error.code !== "PGRST202" && error.code !== "42883") {
      throw new BackendError("DB", "Could not load application settings");
    }
    const { data: legacy, error: legacyError } = await sb.from("app_settings")
      .select("trial_days, reward_access_hours, max_daily_rewarded_ads")
      .eq("id", 1).maybeSingle();
    if (legacyError || !legacy) {
      throw new BackendError("DB", "Application settings are unavailable");
    }
    return {
      trialDays: n(legacy.trial_days),
      rewardAccessHours: n(legacy.reward_access_hours),
      maxDailyRewardedAds: n(legacy.max_daily_rewarded_ads),
    };
  },

  // ── Scans ───────────────────────────────────────────────────────────────
  async reportScanCorrections(scanId, items) {
    if (!items.length) return;
    const userId = await currentUserId();
    const { error } = await getSupabase()
      .from("scan_corrections")
      .insert(
        items.map((i) => ({
          user_id: userId,
          scan_id: scanId,
          item_label: i.label,
          original: i.original as Json,
          corrected: i.corrected as Json,
        })),
      );
    if (error) throw new BackendError("DB", error.message);
  },

  // ── Admin ───────────────────────────────────────────────────────────────
  async amIAdmin() {
    const { data, error } = await getSupabase().rpc("am_i_admin");
    if (error) return false;
    return data === true;
  },

  async adminListUsers(search) {
    const { data, error } = await getSupabase().functions.invoke("admin-query", {
      body: { action: "list_users", search },
    });
    if (error) throw new BackendError("SERVER", error.message);
    return (data.users ?? []) as AdminUserRow[];
  },

  async adminAction(input: AdminActionInput) {
    const { data, error } = await getSupabase().functions.invoke("admin-action", { body: input });
    if (error) throw new BackendError("SERVER", error.message);
    if (data.error) throw new BackendError(data.error, data.message ?? "Admin action failed");
    return data;
  },

  async adminGetAudit(targetUserId) {
    const { data, error } = await getSupabase().functions.invoke("admin-query", {
      body: { action: "get_audit", targetUserId },
    });
    if (error) throw new BackendError("SERVER", error.message);
    return (data.entries ?? []) as AuditLogEntry[];
  },

  async adminGetSettings() {
    return supabaseBackend.getPublicSettings();
  },

  async getReactivationRequests() {
    const { data, error } = await getSupabase().functions.invoke("beta-appeals", {
      body: { action: "status" },
    });
    if (error || data?.error) throw new BackendError("SERVER", "Could not load request status");
    const requests = ((data?.requests ?? []) as Record<string, unknown>[]).map((r): ReactivationRequest => ({
      id: String(r["id"]),
      status: r["status"] as ReactivationRequest["status"],
      createdAt: String(r["created_at"]),
      reviewedAt: (r["reviewed_at"] as string | null) ?? null,
      approvedDays: (r["approved_days"] as number | null) ?? null,
    }));
    return { requests, isBetaTester: data?.isBetaTester === true };
  },

  async submitReactivationRequest(message) {
    const { data, error } = await getSupabase().functions.invoke("beta-appeals", {
      body: { action: "submit", message },
    });
    if (error || data?.error) throw new BackendError("SERVER", "Could not submit your request");
  },

  async adminGetReactivationQueue() {
    const { data, error } = await getSupabase().functions.invoke("beta-appeals", {
      body: { action: "queue" },
    });
    if (error || data?.error) throw new BackendError("SERVER", "Could not load the beta request queue");
    return ((data?.requests ?? []) as Record<string, unknown>[]).map((r): AdminReactivationRequest => {
      const account = r["account"] as Record<string, unknown> | null;
      return {
        id: String(r["id"]),
        userId: String(r["user_id"]),
        status: r["status"] as AdminReactivationRequest["status"],
        createdAt: String(r["created_at"]),
        reviewedAt: (r["reviewed_at"] as string | null) ?? null,
        approvedDays: (r["approved_days"] as number | null) ?? null,
        message: String(r["message"] ?? ""),
        account: account ? { name: String(account["name"] ?? ""), email: String(account["email"] ?? "") } : null,
      };
    });
  },

  async adminReviewReactivation(id, approve, days, reason) {
    const { data, error } = await getSupabase().functions.invoke("beta-appeals", {
      body: { action: "review", requestId: id, approve, days, reason },
    });
    if (error || data?.error || !data?.ok)
      throw new BackendError("SERVER", "The request could not be reviewed");
  },

  // ── Notifications, consents, export ─────────────────────────────────────
  async getNotifications() {
    const { data, error } = await getSupabase()
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new BackendError("DB", error.message);
    return (data ?? []).map((x) => {
      const row = x as Record<string, unknown>;
      return {
        id: String(row["id"]),
        kind: String(row["kind"]),
        title: String(row["title"]),
        body: (row["body"] as string | null) ?? null,
        readAt: (row["read_at"] as string | null) ?? null,
        createdAt: String(row["created_at"]),
      };
    });
  },

  async markNotificationRead(id) {
    await getSupabase()
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
  },

  async setConsent(kind, version) {
    // This is a grant receipt, not a withdrawal marker. The current
    // advertising/analytics choice lives in user_preferences.
    const { error } = await getSupabase()
      .from("user_consents")
      .upsert({ user_id: await currentUserId(), kind, version }, { onConflict: "user_id,kind" });
    if (error) throw new BackendError("DB", "Could not record consent");
  },

  async exportAllData() {
    // Only a deliberate user action invokes this endpoint. It verifies the
    // bearer token and exports that user's records even after trial expiry.
    const { data, error } = await getSupabase().functions.invoke("account-data", {
      body: { action: "export" },
    });
    if (error || !data || data.error || data.formatVersion !== 2) {
      throw new BackendError("EXPORT_FAILED", "Could not produce a complete account export");
    }
    return data as Record<string, unknown>;
  },
};

/** Inverse of scaleNutrients for building saved-meal items. */
function scaleBackToPer100g(base: NutrientRecord, grams: number): NutrientRecord {
  const f = Math.max(grams, 1) / 100;
  const out: NutrientRecord = {};
  for (const [k, v] of Object.entries(base) as [string, number | null][]) {
    out[k as keyof NutrientRecord] = v == null ? null : Math.round((v / f) * 10) / 10;
  }
  return out;
}

function scaleToBase(per100g: NutrientRecord, grams: number): NutrientRecord {
  const f = grams / 100;
  const out: NutrientRecord = {};
  for (const [k, v] of Object.entries(per100g) as [string, number | null][]) {
    out[k as keyof NutrientRecord] = v == null ? null : Math.round(v * f * 10) / 10;
  }
  return out;
}
