import { beforeEach, describe, expect, it } from "vitest";
import { demoBackend as backend } from "@/lib/backend/demo-backend";

const DAY = "2026-11-04";
const FIRST = "isolation-first@example.test";
const SECOND = "isolation-second@example.test";

async function login(email: string) {
  await backend.signUp(email, "demo only", email.split("@")[0]!, "MM-DEMO");
}

async function createPrivateData() {
  await login(FIRST);
  const food = await backend.createCustomFood({
    name: "First user's private sesame bowl",
    per100g: { kcal: 220, protein: 0, fat: 20 },
    servingGrams: 100,
  });
  const diary = await backend.addEntry({
    entryDate: DAY,
    mealType: "lunch",
    name: food.name,
    foodId: food.id,
    grams: 100,
    portionPercent: 100,
    baseNutrients: { kcal: 220, protein: 0, fat: 20 },
    source: "custom",
  });
  await backend.toggleFavorite(food.id);
  const meal = await backend.saveMeal("First person's saved lunch", [diary.id]);
  const recipe = await backend.createRecipe({
    name: "First person's private recipe",
    servings: 2,
    ingredients: [{ name: "Sesame", grams: 100, per100g: { kcal: 220, fat: 20 }, foodId: food.id }],
  });
  const weight = await backend.addWeight(DAY, 66, "First person's weight");
  return { food, diary, meal, recipe, weight };
}

beforeEach(async () => {
  await backend.resetDemoData();
});

describe("demo backend isolation mirrors the production RLS intent", () => {
  it("prevents other users from reading private food, saved recipes, diaries and weights", async () => {
    const first = await createPrivateData();
    await backend.signOut();
    await login(SECOND);

    expect((await backend.getAllFoods()).some((food) => food.id === first.food.id)).toBe(false);
    expect((await backend.getDiary(DAY)).some((item) => item.id === first.diary.id)).toBe(false);
    expect((await backend.getRecipes()).some((item) => item.id === first.recipe.id)).toBe(false);
    expect((await backend.getWeights(20)).some((item) => item.id === first.weight.id)).toBe(false);
    expect((await backend.getSavedMeals()).some((item) => item.id === first.meal.id)).toBe(false);
    expect((await backend.getFavorites()).some((item) => item.food.id === first.food.id)).toBe(false);
  });

  it("rejects cross-account mutations by identifier and preserves the original data", async () => {
    const first = await createPrivateData();
    await backend.signOut();
    await login(SECOND);

    await expect(backend.updateEntry(first.diary.id, { portionPercent: 10 })).rejects.toThrow();
    await expect(backend.deleteEntry(first.diary.id)).rejects.toThrow();
    await expect(backend.saveMeal("Stolen meal", [first.diary.id])).rejects.toThrow();
    await expect(backend.logSavedMeal(first.meal.id, DAY, "dinner")).rejects.toThrow();
    await expect(backend.toggleFavorite(first.food.id)).rejects.toThrow();
    await expect(backend.getRecipeIngredients(first.recipe.id)).rejects.toThrow();
    await expect(backend.deleteRecipe(first.recipe.id)).rejects.toThrow();
    await expect(backend.logRecipe(first.recipe.id, DAY, "dinner", 1)).rejects.toThrow();
    await expect(backend.deleteWeight(first.weight.id)).rejects.toThrow();

    await backend.signOut();
    await backend.signIn(FIRST, "demo only");
    expect((await backend.getDiary(DAY)).find((entry) => entry.id === first.diary.id)?.portionPercent).toBe(100);
    expect((await backend.getRecipes()).some((r) => r.id === first.recipe.id)).toBe(true);
    expect((await backend.getWeights(20)).some((w) => w.id === first.weight.id)).toBe(true);
    expect((await backend.getSavedMeals()).some((meal) => meal.id === first.meal.id)).toBe(true);
  });

  it("allows the owner to edit, delete and log their own private data", async () => {
    const first = await createPrivateData();
    await backend.updateEntry(first.diary.id, { portionPercent: 50 });
    expect((await backend.getDiary(DAY))[0]?.portionPercent).toBe(50);
    expect((await backend.getRecipeIngredients(first.recipe.id))).toHaveLength(1);
    await backend.logRecipe(first.recipe.id, DAY, "dinner", 1);
    await backend.logSavedMeal(first.meal.id, DAY, "snack");
    expect((await backend.getDiary(DAY)).length).toBeGreaterThanOrEqual(3);
    await backend.deleteRecipe(first.recipe.id);
    await backend.deleteWeight(first.weight.id);
    expect(await backend.getRecipes()).toHaveLength(0);
    expect(await backend.getWeights(20)).toHaveLength(0);
  });

  it("deleting an account erases its private records without deleting someone else's", async () => {
    const first = await createPrivateData();
    await backend.signOut();
    await login(SECOND);
    const other = await backend.addWeight(DAY, 75, "Second user's record");
    await backend.signOut();
    await backend.signIn(FIRST, "demo only");
    await backend.deleteAccount();

    await backend.signIn(SECOND, "demo only");
    expect((await backend.getWeights(20)).find((item) => item.id === other.id)?.weightKg).toBe(75);
    expect((await backend.getAllFoods()).some((food) => food.id === first.food.id)).toBe(false);
    expect((await backend.getRecipes()).some((r) => r.id === first.recipe.id)).toBe(false);
    expect((await backend.getSavedMeals()).some((meal) => meal.id === first.meal.id)).toBe(false);
  });
});
