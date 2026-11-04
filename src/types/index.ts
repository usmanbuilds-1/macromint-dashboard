// ── Macromint domain model ────────────────────────────────────────────────
// Shared by UI, business logic, the Supabase backend adapter, and the demo
// backend. Nutrient records use null to mean "unavailable" and reserve 0 for
// a measured zero — the UI must never render a fabricated value.

export type Units = "metric" | "imperial";
export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Objective = "lose" | "maintain" | "gain" | "recomp";
export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";
export type FoodSource = "seed" | "off" | "usda" | "custom";
export type EntrySource = "search" | "favorite" | "recipe" | "scan" | "custom";

export type AccessState =
  | "trial_active"
  | "trial_expired"
  | "paid_active"
  | "complimentary"
  | "revoked"
  | "payment_overdue"
  | "suspended";

export const ACCESS_STATES: AccessState[] = [
  "trial_active",
  "trial_expired",
  "paid_active",
  "complimentary",
  "revoked",
  "payment_overdue",
  "suspended",
];

export const GRANTED_STATES: AccessState[] = ["trial_active", "paid_active", "complimentary"];

// ── Nutrients ─────────────────────────────────────────────────────────────
// All values are grams / mg / µg per 100 g (or per 100 ml) of the food,
// unless stated otherwise on the record.

export const MACRO_KEYS = ["kcal", "protein", "carbs", "fat"] as const;
export const MICRONUTRIENT_KEYS = [
  "fiber",
  "sugar",
  "satFat",
  "transFat",
  "cholesterol",
  "sodium",
  "potassium",
  "calcium",
  "iron",
  "magnesium",
  "zinc",
  "vitaminA",
  "vitaminC",
  "vitaminD",
  "vitaminE",
  "vitaminK",
  "thiamin",
  "riboflavin",
  "niacin",
  "vitaminB6",
  "folate",
  "vitaminB12",
] as const;

export type MacroKey = (typeof MACRO_KEYS)[number];
export type MicronutrientKey = (typeof MICRONUTRIENT_KEYS)[number];
export type NutrientKey = MacroKey | MicronutrientKey;
/** null = information unavailable. 0 = measured zero. Never fabricate. */
export type NutrientRecord = Partial<Record<NutrientKey, number | null>>;

export interface NutrientMeta {
  key: NutrientKey;
  label: string;
  unit: "g" | "mg" | "µg";
  group: "energy" | "macronutrient" | "carbohydrate" | "fat" | "mineral" | "vitamin";
}

export const NUTRIENT_META: NutrientMeta[] = [
  { key: "kcal", label: "Calories", unit: "g", group: "energy" },
  { key: "protein", label: "Protein", unit: "g", group: "macronutrient" },
  { key: "carbs", label: "Carbohydrates", unit: "g", group: "carbohydrate" },
  { key: "fiber", label: "Fiber", unit: "g", group: "carbohydrate" },
  { key: "sugar", label: "Sugars", unit: "g", group: "carbohydrate" },
  { key: "fat", label: "Total fat", unit: "g", group: "fat" },
  { key: "satFat", label: "Saturated fat", unit: "g", group: "fat" },
  { key: "transFat", label: "Trans fat", unit: "g", group: "fat" },
  { key: "cholesterol", label: "Cholesterol", unit: "mg", group: "fat" },
  { key: "sodium", label: "Sodium", unit: "mg", group: "mineral" },
  { key: "potassium", label: "Potassium", unit: "mg", group: "mineral" },
  { key: "calcium", label: "Calcium", unit: "mg", group: "mineral" },
  { key: "iron", label: "Iron", unit: "mg", group: "mineral" },
  { key: "magnesium", label: "Magnesium", unit: "mg", group: "mineral" },
  { key: "zinc", label: "Zinc", unit: "mg", group: "mineral" },
  { key: "vitaminA", label: "Vitamin A", unit: "µg", group: "vitamin" },
  { key: "vitaminC", label: "Vitamin C", unit: "mg", group: "vitamin" },
  { key: "vitaminD", label: "Vitamin D", unit: "µg", group: "vitamin" },
  { key: "vitaminE", label: "Vitamin E", unit: "mg", group: "vitamin" },
  { key: "vitaminK", label: "Vitamin K", unit: "µg", group: "vitamin" },
  { key: "thiamin", label: "Thiamin (B1)", unit: "mg", group: "vitamin" },
  { key: "riboflavin", label: "Riboflavin (B2)", unit: "mg", group: "vitamin" },
  { key: "niacin", label: "Niacin (B3)", unit: "mg", group: "vitamin" },
  { key: "vitaminB6", label: "Vitamin B6", unit: "mg", group: "vitamin" },
  { key: "folate", label: "Folate (B9)", unit: "µg", group: "vitamin" },
  { key: "vitaminB12", label: "Vitamin B12", unit: "µg", group: "vitamin" },
];

// ── Foods ─────────────────────────────────────────────────────────────────
export interface Food {
  id: string;
  /** null = global database item, visible to everyone. */
  ownerId: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  source: FoodSource;
  /** Provider identifier (FDC ID, OFF barcode, etc). */
  sourceId: string | null;
  barcode: string | null;
  /** true = values verified against the source database. */
  verified: boolean;
  per100g: NutrientRecord;
  servingLabel: string;
  servingGrams: number;
  createdAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  foodId: string;
  createdAt: string;
}

/** A saved combination of items, reusable as a one-tap meal template. */
export interface SavedMeal {
  id: string;
  userId: string;
  name: string;
  items: SavedMealItem[];
  createdAt: string;
}

export interface SavedMealItem {
  foodId: string | null;
  name: string;
  brand: string | null;
  grams: number;
  per100g: NutrientRecord;
}

// ── Diary ─────────────────────────────────────────────────────────────────
export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

export interface DiaryEntry {
  id: string;
  userId: string;
  /** Local calendar date, "YYYY-MM-DD", in the user's own timezone. */
  entryDate: string;
  mealType: MealType;
  foodId: string | null;
  recipeId: string | null;
  name: string;
  brand: string | null;
  grams: number;
  /** 1–100. How much of the described quantity was actually eaten. */
  portionPercent: number;
  /** Nutrients for the full logged quantity, before the portion percentage. */
  baseNutrients: NutrientRecord;
  /** Eaten nutrients = baseNutrients × portionPercent / 100. */
  nutrients: NutrientRecord;
  source: EntrySource;
  loggedAt: string;
}

// ── Recipes ───────────────────────────────────────────────────────────────
export interface Recipe {
  id: string;
  userId: string;
  name: string;
  servings: number;
  notes: string | null;
  createdAt: string;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  foodId: string | null;
  name: string;
  grams: number;
  per100g: NutrientRecord;
  position?: number;
}

// ── Body measurements ─────────────────────────────────────────────────────
export interface WeightEntry {
  id: string;
  userId: string;
  entryDate: string;
  weightKg: number;
  note: string | null;
  createdAt: string;
}

export interface WaterEntry {
  id: string;
  userId: string;
  entryDate: string;
  amountMl: number;
  createdAt: string;
}

// ── Profile and goals ─────────────────────────────────────────────────────
export interface UserPreferences {
  userId: string;
  weekStart: number;
  reminders: Record<string, unknown>;
  adConsent: boolean;
  analyticsConsent: boolean;
}

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface Profile {
  userId: string;
  email: string;
  username?: string;
  name: string;
  sex: Sex | null;
  birthYear: number | null;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  activityLevel: ActivityLevel | null;
  objective: Objective | null;
  units: Units;
  onboardedAt: string | null;
}

export interface GoalSet {
  userId: string;
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  waterMl: number;
  /** How the target was derived: "mifflin_st_jeor" etc. */
  method: string;
  manuallyAdjusted: boolean;
}

// ── Access and monetization ───────────────────────────────────────────────
export interface Entitlement {
  userId: string;
  state: AccessState;
  trialStartedAt: string;
  trialEndsAt: string;
  /** Temporary access granted by a verified rewarded ad. */
  accessUntil: string | null;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  provider: string;
  plan: "monthly" | "annual";
  status: "active" | "canceled" | "past_due" | "incomplete" | "expired";
  currentPeriodEnd: string;
  createdAt: string;
}

export interface AppSettings {
  trialDays: number;
  rewardAccessHours: number;
  maxDailyRewardedAds: number;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  targetUserId: string;
  action: string;
  previousState: AccessState | null;
  newState: AccessState | null;
  reason: string | null;
  createdAt: string;
}

export interface AdminUserRow {
  userId: string;
  email: string;
  name: string;
  createdAt: string;
  entitlement: Entitlement | null;
  diaryCount30d: number;
  lastDiaryDate: string | null;
}

// ── AI scanning ───────────────────────────────────────────────────────────
export type Confidence = "low" | "medium" | "high";

export interface ScanItem {
  label: string;
  grams: number;
  /** Per-100g values actually used for the calculation (grounded when possible). */
  per100g: NutrientRecord;
  nutrients: NutrientRecord;
  confidence: Confidence;
  /** "db" = matched against the food database; "ai" = model estimate. */
  grounding: "db" | "ai";
  matchScore: number;
  matchedFoodId: string | null;
  warnings: string[];
}

export interface ScanResult {
  id: string;
  items: ScanItem[];
  overallConfidence: Confidence;
  createdAt: string;
}
