import { expect, it } from "vitest";
import { demoBackend as diary } from "@/lib/backend/demo-backend";
import { dailyTotals } from "@/lib/nutrition/math";

it("keeps a meal with its owner and recalculates totals after a portion edit", async () => {
  const day = "2026-04-14";
  await diary.signUp("first@example.test", "demo only", "First", "MM-DEMO");
  await diary.updateProfile({ onboardedAt: new Date().toISOString() });
  await diary.saveGoals({ calorieTarget: 2100 });
  const entry = await diary.addEntry({
    entryDate: day, mealType: "lunch", name: "Rice bowl", grams: 300,
    portionPercent: 75, baseNutrients: { kcal: 400, protein: 20 }, source: "custom",
  });
  expect(dailyTotals(await diary.getDiary(day)).kcal).toBe(300);
  await diary.updateEntry(entry.id, { portionPercent: 50 });
  expect(dailyTotals(await diary.getDiary(day)).protein).toBe(10);
  await diary.signOut();
  await diary.signUp("second@example.test", "demo only", "Second", "MM-DEMO");
  expect(await diary.getDiary(day)).toHaveLength(0);
  await diary.signOut();
  await diary.signIn("first@example.test", "demo only");
  expect(dailyTotals(await diary.getDiary(day)).kcal).toBe(200);
  expect((await diary.getGoals())?.calorieTarget).toBe(2100);
});
