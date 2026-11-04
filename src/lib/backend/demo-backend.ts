// ── Demo backend ──────────────────────────────────────────────────────────
// Credential-free demo mode used ONLY when Supabase is not configured.
// Data lives in localStorage, is clearly labeled in the UI, and can be
// reset from Settings. In production, the Supabase backend replaces this
// entire module with no changes to feature code.

import type { Backend, AddEntryInput, CustomFoodInput, FoodSearchHit, RecipeInput, SessionUser } from "./types";
import { BackendError } from "./types";
import { applyPortionPercent, scaleNutrients, sumNutrients } from "@/lib/nutrition/math";
import { todayStr } from "@/lib/nutrition/datetime";
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

const STORAGE_KEY = "macromint.demo.v2";
let idCounter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

interface DemoStore {
  users: Array<{ id: string; email: string; name: string; emailVerified: boolean; createdAt: string }>;
  sessionUserId: string | null;
  profiles: Record<string, Profile>;
  prefs: Record<string, UserPreferences>;
  goals: Record<string, GoalSet>;
  entitlements: Record<string, Entitlement>;
  foods: Food[];
  favorites: Favorite[];
  savedMeals: SavedMeal[];
  diary: DiaryEntry[];
  recipes: Recipe[];
  recipeIngredients: RecipeIngredient[];
  weights: WeightEntry[];
  water: WaterEntry[];
  scanCorrections: Array<{ id: string; userId: string; scanId: string; label: string; original: unknown; corrected: unknown; createdAt: string }>;
  notifications: Array<NotificationItem & { userId: string }>;
  consents: Array<{ id: string; userId: string; kind: string; version: string; grantedAt: string }>;
  auditLogs: AuditLogEntry[];
  adminUserIds: string[];
  appSettings: AppSettings;
}

const f = (
  name: string,
  brand: string | null,
  category: string,
  verified: boolean,
  per100g: NutrientRecord,
  servingLabel = "100 g",
  servingGrams = 100,
): Food => ({
  id: uid("food"),
  ownerId: null,
  name,
  brand,
  category,
  source: "seed",
  sourceId: null,
  barcode: null,
  verified,
  per100g,
  servingLabel,
  servingGrams,
  createdAt: "",
});

function seedFoods(): Food[] {
  return [
    f("Chicken breast, cooked, skinless", null, "Meat & fish", true, { kcal: 165, protein: 31, carbs: 0, fat: 3.6, sodium: 74 }),
    f("Basmati rice, cooked", null, "Grains", true, { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 }, "1 cup (160 g)", 160),
    f("Chapati (roti)", null, "Grains", true, { kcal: 264, protein: 8.6, carbs: 46, fat: 6.5, fiber: 4.9, iron: 2.2 }, "1 roti (40 g)", 40),
    f("Egg, boiled", null, "Meat & fish", true, { kcal: 155, protein: 12.6, carbs: 1.1, fat: 10.6, cholesterol: 373 }, "1 large egg (50 g)", 50),
    f("Oats, dry", null, "Grains", true, { kcal: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6, iron: 4.7 }, "40 g", 40),
    f("Whole milk", null, "Dairy", true, { kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3, calcium: 113 }, "1 glass (250 ml)", 250),
    f("Greek yogurt, full fat", null, "Dairy", true, { kcal: 97, protein: 9, carbs: 3.9, fat: 5, calcium: 100 }, "1 pot (170 g)", 170),
    f("Banana", null, "Fruit", true, { kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6, sugar: 12.2, potassium: 358 }, "1 medium (118 g)", 118),
    f("Apple", null, "Fruit", true, { kcal: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4, sugar: 10.4 }, "1 medium (182 g)", 182),
    f("Almonds", null, "Nuts & fats", true, { kcal: 579, protein: 21.2, carbs: 21.6, fat: 49.9, fiber: 12.5, vitaminE: 25.6 }, "10 almonds (12 g)", 12),
    f("Red lentils (masoor), uncooked", null, "Legumes", true, { kcal: 358, protein: 24, carbs: 63, fat: 1.1, fiber: 10.7, iron: 7.4 }),
    f("Cooked red lentils (dal)", null, "Legumes", true, { kcal: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.6, iron: 3.3 }),
    f("Paneer", null, "Dairy", true, { kcal: 296, protein: 20, carbs: 3.4, fat: 22.9, calcium: 480 }, "50 g", 50),
    f("Cheddar cheese", null, "Dairy", true, { kcal: 403, protein: 24.9, carbs: 1.3, fat: 33.1, calcium: 710, sodium: 653 }, "30 g", 30),
    f("Whole wheat flour (atta)", null, "Grains", true, { kcal: 340, protein: 12, carbs: 72, fat: 1.9, fiber: 11, iron: 3.6 }),
    f("Potato, boiled", null, "Vegetables", true, { kcal: 87, protein: 1.9, carbs: 20.1, fat: 0.1, fiber: 1.8, potassium: 379 }),
    f("Broccoli", null, "Vegetables", true, { kcal: 34, protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6, vitaminC: 89.2 }),
    f("Spinach", null, "Vegetables", true, { kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, iron: 2.7 }),
    f("Tomato", null, "Vegetables", true, { kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, vitaminC: 13.7 }, "1 medium (123 g)", 123),
    f("Chicken biryani", null, "Prepared dishes", false, { kcal: 180, protein: 8, carbs: 24, fat: 6, sodium: 350 }, "1 plate (350 g)", 350),
    f("Chicken karahi", null, "Prepared dishes", false, { kcal: 165, protein: 14.5, carbs: 3.5, fat: 9.5, sodium: 380 }, "1 serving (250 g)", 250),
    f("Dal tadka", null, "Prepared dishes", false, { kcal: 105, protein: 5.5, carbs: 12, fat: 3.8, fiber: 4, sodium: 300 }, "1 bowl (200 g)", 200),
    f("Vegetable samosa", null, "Snacks & sweets", false, { kcal: 308, protein: 5, carbs: 32, fat: 17.5, sodium: 400 }, "1 samosa (100 g)", 100),
    f("Naan", null, "Grains", true, { kcal: 310, protein: 8.7, carbs: 50, fat: 8.7, sodium: 320 }, "1 naan (90 g)", 90),
    f("Beef mince, cooked", null, "Meat & fish", true, { kcal: 254, protein: 26, carbs: 0, fat: 15.8, iron: 2.6, zinc: 6.3 }),
    f("Salmon, cooked", null, "Meat & fish", true, { kcal: 208, protein: 20.4, carbs: 0, fat: 13.4, vitaminD: 13.1 }),
    f("Tuna, canned in water", null, "Meat & fish", true, { kcal: 116, protein: 25.5, carbs: 0, fat: 0.8, sodium: 247 }, "1 can (140 g)", 140),
    f("Pasta, cooked", null, "Grains", true, { kcal: 158, protein: 5.8, carbs: 30.9, fat: 0.9, fiber: 1.8 }, "1 cup (140 g)", 140),
    f("Pasta, uncooked", null, "Grains", true, { kcal: 371, protein: 13, carbs: 75, fat: 1.5 }),
    f("Olive oil", null, "Nuts & fats", true, { kcal: 884, protein: 0, carbs: 0, fat: 100, satFat: 13.8 }, "1 tbsp (13.5 g)", 13.5),
    f("Ghee", null, "Nuts & fats", true, { kcal: 900, protein: 0, carbs: 0, fat: 100, satFat: 60 }, "1 tsp (4.5 g)", 4.5),
    f("Peanut butter", null, "Nuts & fats", true, { kcal: 588, protein: 25, carbs: 20, fat: 50.4, sugar: 9.2 }, "1 tbsp (16 g)", 16),
    f("White bread", null, "Grains", true, { kcal: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sodium: 490 }, "1 slice (30 g)", 30),
    f("Chai with whole milk and sugar", null, "Beverages", false, { kcal: 55, protein: 1.6, carbs: 7.5, fat: 1.9, sugar: 6.5 }, "1 cup (150 ml)", 150),
    f("Cola", null, "Beverages", true, { kcal: 42, protein: 0, carbs: 10.6, fat: 0, sugar: 10.6 }, "330 ml can", 330),
    f("French fries", null, "Vegetables", true, { kcal: 312, protein: 3.4, carbs: 41, fat: 15, sodium: 210 }, "Medium portion (115 g)", 115),
    f("Whey protein powder", null, "Supplements", true, { kcal: 400, protein: 80, carbs: 8, fat: 6 }, "1 scoop (30 g)", 30),
    f("Mango", null, "Fruit", true, { kcal: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6, sugar: 13.7, vitaminC: 36.4 }),
    f("Medjool dates", null, "Fruit", true, { kcal: 277, protein: 1.8, carbs: 75, fat: 0.2, fiber: 6.7, sugar: 66.5 }, "1 date (24 g)", 24),
    f("Mixed salad greens", null, "Vegetables", true, { kcal: 20, protein: 1.5, carbs: 3, fat: 0.3, fiber: 1.8 }, "1 bowl (85 g)", 85),
    f("Strawberries", null, "Fruit", true, { kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2, sugar: 4.9, vitaminC: 58.8 }),
    f("Chickpeas, cooked", null, "Legumes", true, { kcal: 164, protein: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6 }),
    f("Tofu, firm", null, "Legumes", true, { kcal: 144, protein: 17.3, carbs: 2.8, fat: 8.7, calcium: 350 }),
    f("Milk chocolate", null, "Snacks & sweets", true, { kcal: 535, protein: 7.6, carbs: 59.4, fat: 29.7, sugar: 51.5 }, "4 squares (40 g)", 40),
    f("Potato chips", null, "Snacks & sweets", true, { kcal: 536, protein: 7, carbs: 53, fat: 34, sodium: 525 }, "1 bag (30 g)", 30),
    f("Prawns, cooked", null, "Meat & fish", true, { kcal: 99, protein: 24, carbs: 0.2, fat: 0.3, cholesterol: 189 }),
    f("Sweet lassi", null, "Beverages", false, { kcal: 100, protein: 2.8, carbs: 16, fat: 2.6, sugar: 13 }, "1 glass (250 ml)", 250),
    f("Seekh kebab", null, "Prepared dishes", false, { kcal: 220, protein: 17, carbs: 3, fat: 15, sodium: 420 }, "2 kebabs (120 g)", 120),
  ];
}

function defaultStore(): DemoStore {
  const foods = seedFoods();
  const now = new Date().toISOString();
  const mkUser = (email: string, name: string, daysAgo: number) => ({
    id: uid("user"),
    email,
    name,
    emailVerified: true,
    createdAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
  });
  const admin = mkUser("demo@macromint.app", "Demo User", 20);
  const expired = mkUser("expired.user@example.com", "Expired User", 40);
  const paid = mkUser("paying.user@example.com", "Paying User", 60);
  const suspended = mkUser("suspended.user@example.com", "Suspended User", 35);

  const users = [admin, expired, paid, suspended];
  const profiles: Record<string, Profile> = {};
  const goals: Record<string, GoalSet> = {};
  const entitlements: Record<string, Entitlement> = {};
  const prefs: Record<string, UserPreferences> = {};

  for (const u of users) {
    profiles[u.id] = {
      userId: u.id,
      email: u.email,
      name: u.name,
      sex: "male",
      birthYear: 1994,
      heightCm: 176,
      weightKg: 78,
      targetWeightKg: 72,
      activityLevel: "moderate",
      objective: "lose",
      units: "metric",
      onboardedAt: now,
    };
    goals[u.id] = {
      userId: u.id,
      calorieTarget: 2100,
      proteinG: 156,
      carbsG: 190,
      fatG: 66,
      fiberG: 29,
      waterMl: 2700,
      method: "mifflin_st_jeor",
      manuallyAdjusted: false,
    };
    prefs[u.id] = { userId: u.id, weekStart: 1, reminders: {}, adConsent: false, analyticsConsent: false };
  }

  entitlements[admin.id] = { userId: admin.id, state: "trial_active", trialStartedAt: now, trialEndsAt: new Date(Date.now() + 12 * 86_400_000).toISOString(), accessUntil: null, updatedAt: now };
  entitlements[expired.id] = { userId: expired.id, state: "trial_expired", trialStartedAt: new Date(Date.now() - 40 * 86_400_000).toISOString(), trialEndsAt: new Date(Date.now() - 26 * 86_400_000).toISOString(), accessUntil: null, updatedAt: now };
  entitlements[paid.id] = { userId: paid.id, state: "paid_active", trialStartedAt: new Date(Date.now() - 60 * 86_400_000).toISOString(), trialEndsAt: new Date(Date.now() - 46 * 86_400_000).toISOString(), accessUntil: null, updatedAt: now };
  entitlements[suspended.id] = { userId: suspended.id, state: "suspended", trialStartedAt: now, trialEndsAt: new Date(Date.now() + 10 * 86_400_000).toISOString(), accessUntil: null, updatedAt: now };

  return {
    users,
    sessionUserId: null,
    profiles,
    prefs,
    goals,
    entitlements,
    foods,
    favorites: [],
    savedMeals: [],
    diary: [],
    recipes: [],
    recipeIngredients: [],
    weights: [],
    water: [],
    scanCorrections: [],
    notifications: [],
    consents: [],
    auditLogs: [],
    adminUserIds: [admin.id],
    appSettings: { trialDays: 14, rewardAccessHours: 24, maxDailyRewardedAds: 3 },
  };
}

function load(): DemoStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DemoStore;
  } catch {
    // corrupted store → reseed
  }
  const fresh = defaultStore();
  save(fresh);
  return fresh;
}

function save(store: DemoStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

let store: DemoStore | null = null;
function s(): DemoStore {
  if (!store) store = load();
  return store;
}

function requireUser(): string {
  const st = s();
  if (!st.sessionUserId) throw new BackendError("AUTH", "Not signed in");
  return st.sessionUserId;
}

type DemoExtras = {
  getSessionUserSync(): SessionUser | null;
  seedNewUser(userId: string, email: string, name: string): void;
};

export const demoBackend: Backend & DemoExtras = {
  // ── Auth ────────────────────────────────────────────────────────────────
  async getSessionUser() {
    const st = s();
    if (!st.sessionUserId) return null;
    const u = st.users.find((x) => x.id === st.sessionUserId);
    return u ? { id: u.id, email: u.email, emailVerified: u.emailVerified } : null;
  },

  async signIn(email) {
    const st = s();
    let user = st.users.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      user = { id: uid("user"), email, name: email.split("@")[0] || email, emailVerified: true, createdAt: new Date().toISOString() };
      st.users.push(user);
      demoBackend.seedNewUser(user.id, email, user.name);
    } else {
      st.entitlements[user.id] = st.entitlements[user.id] ?? {
        userId: user.id,
        state: "trial_active",
        trialStartedAt: new Date().toISOString(),
        trialEndsAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
        accessUntil: null,
        updatedAt: new Date().toISOString(),
      };
    }
    st.sessionUserId = user.id;
    save(st);
  },

  async signUp(email, _password, name, _inviteCode) {
    await demoBackend.signIn(email, "");
    return { needsVerification: false };
  },

  async signOut() {
    const st = s();
    st.sessionUserId = null;
    save(st);
  },

  async requestPasswordReset() {
    // Demo mode: nothing to reset.
  },

  async resendVerification() {},

  onAuthChange(cb) {
    cb(demoBackend.getSessionUserSync());
    const handler = () => cb(demoBackend.getSessionUserSync());
    window.addEventListener("macromint:auth", handler);
    return () => window.removeEventListener("macromint:auth", handler);
  },

  getSessionUserSync(): SessionUser | null {
    const st = s();
    if (!st.sessionUserId) return null;
    const u = st.users.find((x) => x.id === st.sessionUserId);
    return u ? { id: u.id, email: u.email, emailVerified: u.emailVerified } : null;
  },

  seedNewUser(userId: string, email: string, name: string) {
    const st = s();
    st.profiles[userId] = { userId, email, name, sex: null, birthYear: null, heightCm: null, weightKg: null, targetWeightKg: null, activityLevel: null, objective: null, units: "metric", onboardedAt: null };
    st.goals[userId] = { userId, calorieTarget: 2000, proteinG: 100, carbsG: 220, fatG: 67, fiberG: 28, waterMl: 2500, method: "placeholder", manuallyAdjusted: false };
    st.prefs[userId] = { userId, weekStart: 1, reminders: {}, adConsent: false, analyticsConsent: false };
    st.entitlements[userId] = { userId, state: "trial_active", trialStartedAt: new Date().toISOString(), trialEndsAt: new Date(Date.now() + st.appSettings.trialDays * 86_400_000).toISOString(), accessUntil: null, updatedAt: new Date().toISOString() };
    save(st);
  },

  async deleteAccount() {
    const st = s();
    const id = requireUser();
    st.users = st.users.filter((u) => u.id !== id);
    delete st.profiles[id];
    delete st.goals[id];
    delete st.prefs[id];
    delete st.entitlements[id];
    const ownRecipeIds = new Set(st.recipes.filter((r) => r.userId === id).map((r) => r.id));
    const ownFoodIds = new Set(st.foods.filter((food) => food.ownerId === id).map((food) => food.id));
    st.diary = st.diary.filter((d) => d.userId !== id);
    st.weights = st.weights.filter((entry) => entry.userId !== id);
    st.water = st.water.filter((entry) => entry.userId !== id);
    st.favorites = st.favorites.filter((fav) => fav.userId !== id && !ownFoodIds.has(fav.foodId));
    st.savedMeals = st.savedMeals.filter((meal) => meal.userId !== id);
    st.recipes = st.recipes.filter((recipe) => recipe.userId !== id);
    st.recipeIngredients = st.recipeIngredients.filter((ingredient) => !ownRecipeIds.has(ingredient.recipeId));
    st.foods = st.foods.filter((food) => food.ownerId !== id);
    st.scanCorrections = st.scanCorrections.filter((entry) => entry.userId !== id);
    st.notifications = st.notifications.filter((entry) => entry.userId !== id);
    st.consents = st.consents.filter((entry) => entry.userId !== id);
    st.auditLogs = st.auditLogs.filter((entry) => entry.adminId !== id && entry.targetUserId !== id);
    st.adminUserIds = st.adminUserIds.filter((userId) => userId !== id);
    st.sessionUserId = null;
    save(st);
    window.dispatchEvent(new Event("macromint:auth"));
  },

  // ── Profile, goals, preferences ─────────────────────────────────────────
  async getProfile() {
    return s().profiles[requireUser()] ?? null;
  },

  async updateProfile(patch) {
    const st = s();
    const id = requireUser();
    const previous = st.profiles[id];
    if (!previous) throw new BackendError("NOT_FOUND", "Account data missing");
    st.profiles[id] = { ...previous, ...patch };
    save(st);
    return st.profiles[id];
  },

  async getGoals() {
    return s().goals[requireUser()] ?? null;
  },

  async saveGoals(goals) {
    const st = s();
    const id = requireUser();
    const previous = st.goals[id];
    if (!previous) throw new BackendError("NOT_FOUND", "Account data missing");
    st.goals[id] = { ...previous, ...goals, userId: id };
    save(st);
    return st.goals[id];
  },

  async getPreferences() {
    const prefs = s().prefs[requireUser()];
    if (!prefs) throw new BackendError("NOT_FOUND", "Preferences missing");
    return prefs;
  },

  async savePreferences(patch) {
    const st = s();
    const id = requireUser();
    const previous = st.prefs[id];
    if (!previous) throw new BackendError("NOT_FOUND", "Account data missing");
    st.prefs[id] = { ...previous, ...patch };
    save(st);
    return st.prefs[id];
  },

  // ── Foods ───────────────────────────────────────────────────────────────
  async searchFoods(q) {
    const st = s();
    const term = q.trim().toLowerCase();
    const local = term
      ? st.foods.filter((fd) => canReadFood(fd, requireUser()) && fd.name.toLowerCase().includes(term)).slice(0, 8)
      : st.foods.filter((fd) => canReadFood(fd, requireUser())).slice(0, 8);

    // Demo mode also tries Open Food Facts directly (CORS-enabled, keyless)
    // so branded search works in the preview. Failures degrade silently.
    const remote: FoodSearchHit["remote"] = [];
    if (term.length >= 3) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=5&fields=code,product_name,brands,nutriments`,
          { signal: ctrl.signal },
        );
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          for (const p of data.products ?? []) {
            const n = p.nutriments ?? {};
            if (!p.product_name || n["energy-kcal_100g"] == null) continue;
            remote.push({
              id: null,
              name: p.brands ? `${p.product_name} (${String(p.brands).split(",")[0]})` : p.product_name,
              brand: p.brands ? String(p.brands).split(",")[0]?.trim() ?? null : null,
              per100g: {
                kcal: Math.round(n["energy-kcal_100g"] ?? 0),
                protein: n.proteins_100g ?? null,
                carbs: n.carbohydrates_100g ?? null,
                fat: n.fat_100g ?? null,
                sugar: n.sugars_100g ?? null,
                satFat: n["saturated-fat_100g"] ?? null,
                sodium: n.sodium_100g != null ? Math.round(n.sodium_100g * 1000) : null,
              },
              servingLabel: "100 g",
              servingGrams: 100,
              sourceId: p.code ?? null,
            });
          }
        }
      } catch {
        // Offline or blocked: local results only.
      }
    }
    return { local, remote, attribution: "Includes food data from Open Food Facts (ODbL) — openfoodfacts.org" };
  },

  async lookupBarcode() {
    return { local: [], remote: [], attribution: null, warning: "Barcode lookup requires the configured server. Available in production." };
  },

  async createCustomFood(input: CustomFoodInput) {
    const st = s();
    const userId = requireUser();
    const food: Food = {
      id: uid("food"),
      ownerId: userId,
      name: input.name,
      brand: input.brand ?? null,
      category: input.category ?? null,
      source: "custom",
      sourceId: null,
      barcode: null,
      verified: false,
      per100g: input.per100g,
      servingLabel: input.servingLabel ?? "100 g",
      servingGrams: input.servingGrams ?? 100,
      createdAt: new Date().toISOString(),
    };
    st.foods.push(food);
    save(st);
    return food;
  },

  async getFavorites() {
    const st = s();
    const userId = requireUser();
    return st.favorites
      .filter((x) => x.userId === userId)
      .map((fav) => ({ ...fav, food: st.foods.find((fd) => fd.id === fav.foodId && canReadFood(fd, userId))! }))
      .filter((x) => x.food);
  },

  async toggleFavorite(foodId) {
    const st = s();
    const userId = requireUser();
    if (!st.foods.some((fd) => fd.id === foodId && canReadFood(fd, userId))) {
      throw new BackendError("NOT_FOUND", "Food not found");
    }
    const existing = st.favorites.find((x) => x.userId === userId && x.foodId === foodId);
    if (existing) {
      st.favorites = st.favorites.filter((x) => x.id !== existing.id);
      save(st);
      return false;
    }
    st.favorites.push({ id: uid("fav"), userId, foodId, createdAt: new Date().toISOString() });
    save(st);
    return true;
  },

  async getRecentEntries(limit) {
    const st = s();
    const userId = requireUser();
    return [...st.diary].filter((d) => d.userId === userId).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)).slice(0, limit);
  },

  async saveMeal(name, entryIds) {
    const st = s();
    const userId = requireUser();
    if (!entryIds.length || entryIds.some((id) => !st.diary.some((d) => d.id === id && d.userId === userId))) {
      throw new BackendError("NOT_FOUND", "Select entries from your own diary");
    }
    const items = st.diary
      .filter((d) => d.userId === userId && entryIds.includes(d.id))
      .map((d) => ({
        foodId: d.foodId,
        name: d.name,
        brand: d.brand,
        grams: d.grams,
        per100g: scaleNutrients(d.baseNutrients, 100, (100 * 100) / Math.max(d.grams, 1)),
      }));
    const meal: SavedMeal = { id: uid("meal"), userId, name, items, createdAt: new Date().toISOString() };
    st.savedMeals.unshift(meal);
    save(st);
    return meal;
  },

  async getSavedMeals() {
    const st = s();
    const userId = requireUser();
    return st.savedMeals.filter((m) => m.userId === userId);
  },

  async logSavedMeal(id, entryDate, mealType) {
    const st = s();
    const userId = requireUser();
    const meal = st.savedMeals.find((m) => m.id === id && m.userId === userId);
    if (!meal) throw new BackendError("NOT_FOUND", "Saved meal not found");
    for (const item of meal.items) {
      const base = scaleNutrients(item.per100g, item.grams);
      await demoBackend.addEntry({
        entryDate, mealType, foodId: item.foodId, name: item.name, brand: item.brand,
        grams: item.grams, portionPercent: 100, baseNutrients: base, source: "favorite",
      });
    }
  },

  // ── Diary ───────────────────────────────────────────────────────────────
  async getDiary(entryDate) {
    const st = s();
    const userId = requireUser();
    return st.diary.filter((d) => d.userId === userId && d.entryDate === entryDate).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  },

  async addEntry(input: AddEntryInput) {
    const st = s();
    const userId = requireUser();
    if (!hasAccess(st, userId)) throw new BackendError("NO_ACCESS", "Active access required");
    const entry: DiaryEntry = {
      id: uid("entry"),
      userId,
      entryDate: input.entryDate,
      mealType: input.mealType,
      foodId: input.foodId ?? null,
      recipeId: input.recipeId ?? null,
      name: input.name,
      brand: input.brand ?? null,
      grams: input.grams,
      portionPercent: input.portionPercent,
      baseNutrients: input.baseNutrients,
      nutrients: applyPortionPercent(input.baseNutrients, input.portionPercent),
      source: input.source,
      loggedAt: new Date().toISOString(),
    };
    st.diary.push(entry);
    save(st);
    return entry;
  },

  async updateEntry(id, patch) {
    const st = s();
    const userId = requireUser();
    const idx = st.diary.findIndex((d) => d.id === id && d.userId === userId);
    if (idx < 0) throw new BackendError("NOT_FOUND", "Entry not found");
    const current = st.diary[idx];
    if (!current) throw new BackendError("NOT_FOUND", "Diary entry missing");
    const base = patch.baseNutrients ?? current.baseNutrients;
    const pct = patch.portionPercent ?? current.portionPercent;
    st.diary[idx] = {
      ...current,
      ...patch,
      baseNutrients: base,
      portionPercent: pct,
      nutrients: applyPortionPercent(base, pct),
    };
    save(st);
    return st.diary[idx]!;
  },

  async deleteEntry(id) {
    const st = s();
    const userId = requireUser();
    if (!st.diary.some((d) => d.id === id && d.userId === userId)) {
      throw new BackendError("NOT_FOUND", "Diary entry not found");
    }
    st.diary = st.diary.filter((d) => !(d.id === id && d.userId === userId));
    save(st);
  },

  async copyDay(fromDate, toDate) {
    const st = s();
    const userId = requireUser();
    const entries = st.diary.filter((d) => d.userId === userId && d.entryDate === fromDate);
    for (const e of entries) {
      st.diary.push({ ...e, id: uid("entry"), entryDate: toDate, loggedAt: new Date().toISOString() });
    }
    save(st);
    return entries.length;
  },

  // ── Recipes ─────────────────────────────────────────────────────────────
  async getRecipes() {
    const st = s();
    const userId = requireUser();
    return st.recipes.filter((r) => r.userId === userId);
  },

  async getRecipeIngredients(recipeId) {
    const st = s();
    const userId = requireUser();
    if (!st.recipes.some((r) => r.id === recipeId && r.userId === userId)) {
      throw new BackendError("NOT_FOUND", "Recipe not found");
    }
    return st.recipeIngredients.filter((i) => i.recipeId === recipeId);
  },

  async createRecipe(input: RecipeInput) {
    const st = s();
    const userId = requireUser();
    const recipe: Recipe = { id: uid("recipe"), userId, name: input.name, servings: input.servings, notes: input.notes ?? null, createdAt: new Date().toISOString() };
    st.recipes.unshift(recipe);
    input.ingredients.forEach((ing, idx) => {
      st.recipeIngredients.push({ id: uid("ring"), recipeId: recipe.id, foodId: ing.foodId ?? null, name: ing.name, grams: ing.grams, per100g: ing.per100g, position: idx });
    });
    save(st);
    return recipe;
  },

  async deleteRecipe(id) {
    const st = s();
    const userId = requireUser();
    if (!st.recipes.some((r) => r.id === id && r.userId === userId)) {
      throw new BackendError("NOT_FOUND", "Recipe not found");
    }
    st.recipes = st.recipes.filter((r) => !(r.id === id && r.userId === userId));
    st.recipeIngredients = st.recipeIngredients.filter((i) => i.recipeId !== id);
    save(st);
  },

  async logRecipe(recipeId, entryDate, mealType, servings) {
    const st = s();
    const userId = requireUser();
    const recipe = st.recipes.find((r) => r.id === recipeId && r.userId === userId);
    if (!recipe) throw new BackendError("NOT_FOUND", "Recipe not found");
    const ingredients = st.recipeIngredients.filter((i) => i.recipeId === recipeId);
    const total = sumNutrients(ingredients.map((i) => scaleNutrients(i.per100g, i.grams)));
    const perServing = applyPortionPercent(total, (servings / recipe.servings) * 100);
    return demoBackend.addEntry({
      entryDate, mealType, recipeId, name: recipe.name,
      grams: 100 * servings, portionPercent: 100, baseNutrients: perServing, source: "recipe",
    });
  },

  // ── Body measurements ───────────────────────────────────────────────────
  async getWeights(limit) {
    const st = s();
    const userId = requireUser();
    return st.weights.filter((w) => w.userId === userId).sort((a, b) => b.entryDate.localeCompare(a.entryDate)).slice(0, limit);
  },

  async addWeight(entryDate, weightKg, note) {
    const st = s();
    const userId = requireUser();
    const existing = st.weights.find((w) => w.userId === userId && w.entryDate === entryDate);
    if (existing) {
      existing.weightKg = weightKg;
      existing.note = note ?? null;
      save(st);
      return existing;
    }
    const entry: WeightEntry = { id: uid("weight"), userId, entryDate, weightKg, note: note ?? null, createdAt: new Date().toISOString() };
    st.weights.push(entry);
    save(st);
    return entry;
  },

  async deleteWeight(id) {
    const st = s();
    const userId = requireUser();
    if (!st.weights.some((w) => w.id === id && w.userId === userId)) {
      throw new BackendError("NOT_FOUND", "Weight entry not found");
    }
    st.weights = st.weights.filter((w) => !(w.id === id && w.userId === userId));
    save(st);
  },

  async getWater(entryDate) {
    const st = s();
    const userId = requireUser();
    return st.water.filter((w) => w.userId === userId && w.entryDate === entryDate);
  },

  async addWater(entryDate, amountMl) {
    const st = s();
    const userId = requireUser();
    st.water.push({ id: uid("water"), userId, entryDate, amountMl, createdAt: new Date().toISOString() });
    save(st);
  },

  // ── Entitlement, settings ───────────────────────────────────────────────
  async getEntitlement() {
    return s().entitlements[requireUser()] ?? null;
  },

  async getPublicSettings() {
    return s().appSettings;
  },

  // ── Scans ───────────────────────────────────────────────────────────────
  async reportScanCorrections(scanId, items) {
    const st = s();
    const userId = requireUser();
    for (const i of items) {
      st.scanCorrections.push({ id: uid("corr"), userId, scanId, label: i.label, original: i.original, corrected: i.corrected, createdAt: new Date().toISOString() });
    }
    save(st);
  },

  // ── Admin ───────────────────────────────────────────────────────────────
  async amIAdmin() {
    const st = s();
    return st.sessionUserId !== null && st.adminUserIds.includes(st.sessionUserId);
  },

  async adminListUsers(search) {
    const st = s();
    const adminId = requireUser();
    if (!st.adminUserIds.includes(adminId)) throw new BackendError("FORBIDDEN", "Administrator access required");
    const term = search.trim().toLowerCase();
    return st.users
      .filter((u) => !term || u.email.toLowerCase().includes(term) || u.name.toLowerCase().includes(term))
      .map((u): AdminUserRow => {
        const usage = st.diary.filter((d) => d.userId === u.id && d.entryDate >= new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));
        return {
          userId: u.id,
          email: u.email,
          name: u.name,
          createdAt: u.createdAt,
          entitlement: st.entitlements[u.id] ?? null,
          diaryCount30d: usage.length,
          lastDiaryDate: usage.length ? usage.map((d) => d.entryDate).sort().at(-1) ?? null : null,
        };
      });
  },

  async adminAction(input) {
    const st = s();
    const adminId = requireUser();
    // Mirror production admin authorization even in local preview mode.
    if (!st.adminUserIds.includes(adminId)) throw new BackendError("FORBIDDEN", "Administrator access required");
    const { action, targetUserId, days } = input;

    if (action === "set_trial_days") {
      st.appSettings.trialDays = Math.min(Math.max(Math.round(Number(days) || 0), 0), 90);
      st.auditLogs.unshift({ id: uid("audit"), adminId, targetUserId: adminId, action, previousState: null, newState: null, reason: input.reason ?? null, createdAt: new Date().toISOString() });
      save(st);
      return { ok: true };
    }
    if (action === "set_reward_config") {
      st.appSettings.rewardAccessHours = Number(days) || 24;
      save(st);
      return { ok: true };
    }
    if (!targetUserId) throw new BackendError("BAD_REQUEST", "targetUserId required");
    const ent = st.entitlements[targetUserId];
    if (!ent && action !== "add_note") throw new BackendError("NOT_FOUND", "No entitlement record");

    const prev = ent?.state ?? null;
    switch (action) {
      case "grant_access": if (ent) { ent.state = "paid_active"; } break;
      case "grant_complimentary": if (ent) { ent.state = "complimentary"; } break;
      case "revoke_access": if (ent) { ent.state = "revoked"; } break;
      case "restore_access": if (ent) { ent.state = (input.state ?? "paid_active") as Entitlement["state"]; } break;
      case "extend_trial":
      case "shorten_trial": {
        const sign = action === "extend_trial" ? 1 : -1;
        if (ent) {
          const base = Math.max(Date.parse(ent.trialEndsAt), Date.now());
          ent.trialEndsAt = new Date(base + sign * (Number(days) || 0) * 86_400_000).toISOString();
          if (ent.trialEndsAt >= new Date().toISOString() && ent.state !== "revoked" && ent.state !== "suspended") ent.state = "trial_active";
        }
        break;
      }
      case "suspend": if (ent) { ent.state = "suspended"; } break;
      case "reactivate": if (ent) { ent.state = ent.trialEndsAt >= new Date().toISOString() ? "trial_active" : "paid_active"; } break;
      case "add_note": break;
      default: throw new BackendError("BAD_REQUEST", `Unknown action: ${action}`);
    }
    if (ent) ent.updatedAt = new Date().toISOString();
    st.auditLogs.unshift({
      id: uid("audit"), adminId, targetUserId, action,
      previousState: prev, newState: action === "add_note" ? null : ent?.state ?? null,
      reason: input.reason ?? input.note ?? null, createdAt: new Date().toISOString(),
    });
    save(st);
    return ent ? { ok: true, entitlement: ent } : { ok: true };
  },

  async adminGetAudit(targetUserId) {
    const st = s();
    const adminId = requireUser();
    if (!st.adminUserIds.includes(adminId)) throw new BackendError("FORBIDDEN", "Administrator access required");
    return st.auditLogs.filter((a) => !targetUserId || a.targetUserId === targetUserId).slice(0, 200);
  },

  async adminGetSettings() {
    const st = s();
    const adminId = requireUser();
    if (!st.adminUserIds.includes(adminId)) throw new BackendError("FORBIDDEN", "Administrator access required");
    return st.appSettings;
  },

  // ── Notifications, consents, export ─────────────────────────────────────
  async getNotifications() {
    const st = s();
    const userId = requireUser();
    return st.notifications.filter((n) => n.userId === userId).slice(0, 30);
  },

  async markNotificationRead(id) {
    const st = s();
    const userId = requireUser();
    const n = st.notifications.find((x) => x.id === id && x.userId === userId);
    if (!n) throw new BackendError("NOT_FOUND", "Notification not found");
    n.readAt = new Date().toISOString();
    save(st);
  },

  async setConsent(kind, version) {
    const st = s();
    const userId = requireUser();
    st.consents.push({ id: uid("consent"), userId, kind, version, grantedAt: new Date().toISOString() });
    save(st);
  },

  async exportAllData() {
    const st = s();
    const userId = requireUser();
    return {
      exportedAt: new Date().toISOString(),
      demo: true,
      profile: st.profiles[userId],
      goals: st.goals[userId],
      diary: st.diary.filter((d) => d.userId === userId),
      recipes: st.recipes.filter((r) => r.userId === userId),
      weightEntries: st.weights.filter((w) => w.userId === userId),
      waterEntries: st.water.filter((w) => w.userId === userId),
      favorites: st.favorites.filter((x) => x.userId === userId),
    };
  },

  async resetDemoData() {
    store = defaultStore();
    save(store);
    window.dispatchEvent(new Event("macromint:auth"));
  },

  async getAllFoods() {
    const userId = requireUser();
    return s().foods.filter((fd) => canReadFood(fd, userId));
  },
};

/** Seed foods are public; user-created foods are private to their owner. */
function canReadFood(food: Food, userId: string): boolean {
  return food.ownerId === null || food.ownerId === userId;
}

function hasAccess(st: DemoStore, userId: string): boolean {
  const e = st.entitlements[userId];
  if (!e) return false;
  if (["paid_active", "complimentary"].includes(e.state)) return true;
  if (e.state === "trial_active" && new Date(e.trialEndsAt).getTime() >= Date.now()) return true;
  if (e.accessUntil && new Date(e.accessUntil).getTime() > Date.now()) return true;
  return false;
}

export { hasAccess };
export type { MealType };
