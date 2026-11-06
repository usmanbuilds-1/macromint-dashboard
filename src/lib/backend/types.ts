// ── Backend contract ──────────────────────────────────────────────────────
// The single data-access interface every feature uses. Two implementations:
//   • supabaseBackend — production (RLS-enforced, Edge Functions for
//     privileged operations)
//   • demoBackend     — credential-free demo mode (clearly labeled in the UI)
// Features never talk to supabase-js directly.

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
  ScanResult,
  SavedMeal,
  UserPreferences,
  WaterEntry,
  WeightEntry,
} from "@/types";

export interface FoodSearchHit {
  local: Food[];
  remote: OffFoodHit[];
  attribution: string | null;
  warning?: string;
}

export interface OffFoodHit {
  id: string | null;
  name: string;
  brand: string | null;
  per100g: NutrientRecord;
  servingLabel: string;
  servingGrams: number;
  sourceId: string | null;
}

export interface CustomFoodInput {
  name: string;
  brand?: string | null;
  category?: string | null;
  per100g: NutrientRecord;
  servingLabel?: string;
  servingGrams?: number;
}

export interface AddEntryInput {
  entryDate: string;
  mealType: MealType;
  foodId?: string | null;
  recipeId?: string | null;
  name: string;
  brand?: string | null;
  grams: number;
  portionPercent: number;
  baseNutrients: NutrientRecord;
  source: DiaryEntry["source"];
}

export interface RecipeInput {
  name: string;
  servings: number;
  notes?: string | null;
  ingredients: Array<{
    foodId?: string | null;
    name: string;
    grams: number;
    per100g: NutrientRecord;
  }>;
}

export interface AdminActionInput {
  action: string;
  targetUserId?: string;
  reason?: string;
  days?: number;
  date?: string;
  state?: string;
  note?: string;
}

export interface ReactivationRequest {
  id: string;
  status: "pending" | "approved" | "denied";
  createdAt: string;
  reviewedAt: string | null;
  approvedDays: number | null;
}

export interface AdminReactivationRequest extends ReactivationRequest {
  userId: string;
  message: string;
  account: { name: string; email: string } | null;
}

export interface SessionUser {
  id: string;
  email: string;
  emailVerified: boolean;
  /** Username identity, only for accounts enrolled without a contact email. */
  username?: string;
}

export type Unsubscribe = () => void;

export interface Backend {
  // Auth
  getSessionUser(): Promise<SessionUser | null>;
  signIn(usernameOrEmail: string, password: string): Promise<void>;
  signUp(usernameOrEmail: string, password: string, name: string, inviteCode: string): Promise<{ needsVerification: boolean; recoveryCodes?: string[] }>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  recoverUsernamePassword(username: string, recoveryCode: string, newPassword: string): Promise<void>;
  resendVerification(): Promise<void>;
  onAuthChange(cb: (user: SessionUser | null) => void): Unsubscribe;
  deleteAccount(): Promise<void>;

  // Profile, goals, preferences
  getProfile(): Promise<Profile | null>;
  updateProfile(patch: Partial<Profile>): Promise<Profile>;
  getGoals(): Promise<GoalSet | null>;
  saveGoals(goals: Partial<GoalSet>): Promise<GoalSet>;
  getPreferences(): Promise<UserPreferences>;
  savePreferences(patch: Partial<UserPreferences>): Promise<UserPreferences>;

  // Foods
  searchFoods(q: string): Promise<FoodSearchHit>;
  lookupBarcode(barcode: string): Promise<FoodSearchHit>;
  createCustomFood(input: CustomFoodInput): Promise<Food>;
  getFavorites(): Promise<(Favorite & { food: Food })[]>;
  toggleFavorite(foodId: string): Promise<boolean>;
  getRecentEntries(limit: number): Promise<DiaryEntry[]>;
  saveMeal(name: string, entryIds: string[]): Promise<SavedMeal>;
  getSavedMeals(): Promise<SavedMeal[]>;
  logSavedMeal(id: string, entryDate: string, mealType: MealType): Promise<void>;

  // Diary
  getDiary(entryDate: string): Promise<DiaryEntry[]>;
  /** One bounded read for progress charts instead of 7–30 HTTP requests. */
  getDiaryRange(startDate: string, endDate: string): Promise<DiaryEntry[]>;
  addEntry(input: AddEntryInput): Promise<DiaryEntry>;
  updateEntry(id: string, patch: Partial<Pick<DiaryEntry, "grams" | "portionPercent" | "mealType" | "baseNutrients" | "nutrients" | "name">>): Promise<DiaryEntry>;
  deleteEntry(id: string): Promise<void>;
  copyDay(fromDate: string, toDate: string): Promise<number>;

  // Recipes
  getRecipes(): Promise<Recipe[]>;
  getRecipeIngredients(recipeId: string): Promise<RecipeIngredient[]>;
  createRecipe(input: RecipeInput): Promise<Recipe>;
  deleteRecipe(id: string): Promise<void>;
  logRecipe(recipeId: string, entryDate: string, mealType: MealType, servings: number): Promise<DiaryEntry>;

  // Body measurements
  getWeights(limit: number): Promise<WeightEntry[]>;
  addWeight(entryDate: string, weightKg: number, note?: string): Promise<WeightEntry>;
  deleteWeight(id: string): Promise<void>;
  getWater(entryDate: string): Promise<WaterEntry[]>;
  addWater(entryDate: string, amountMl: number): Promise<void>;

  // Entitlement and platform settings
  getEntitlement(): Promise<Entitlement | null>;
  getPublicSettings(): Promise<AppSettings>;

  // Scans
  reportScanCorrections(scanId: string, items: Array<{ label: string; original: unknown; corrected: unknown }>): Promise<void>;

  // Admin
  amIAdmin(): Promise<boolean>;
  adminListUsers(search: string): Promise<AdminUserRow[]>;
  adminAction(input: AdminActionInput): Promise<{ ok: boolean; entitlement?: Entitlement }>;
  adminGetAudit(targetUserId?: string): Promise<AuditLogEntry[]>;
  adminGetSettings(): Promise<AppSettings>;
  getReactivationRequests(): Promise<{ requests: ReactivationRequest[]; isBetaTester: boolean }>;
  submitReactivationRequest(message: string): Promise<void>;
  adminGetReactivationQueue(): Promise<AdminReactivationRequest[]>;
  adminReviewReactivation(id: string, approve: boolean, days: number | null, reason: string): Promise<void>;

  // Notifications, consents, export
  getNotifications(): Promise<NotificationItem[]>;
  markNotificationRead(id: string): Promise<void>;
  setConsent(kind: "analytics" | "advertising" | "terms" | "privacy", version: string): Promise<void>;
  exportAllData(): Promise<Record<string, unknown>>;

  // Demo-mode only
  resetDemoData?(): Promise<void>;
  /** Demo mode only: the full local food list for client-side scan grounding. */
  getAllFoods?(): Promise<Food[]>;
}

export class BackendError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
