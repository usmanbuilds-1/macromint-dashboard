import { beforeEach, describe, expect, it } from "vitest";
import { demoBackend as backend } from "@/lib/backend/demo-backend";

const firstUser = "range-one@example.test";
const secondUser = "range-two@example.test";

async function addFor(date: string, name: string) {
  return backend.addEntry({
    entryDate: date, mealType: "lunch", name, foodId: null,
    grams: 120, portionPercent: 100,
    baseNutrients: { kcal: 180, protein: 7, carbs: 21, fat: 6 },
    source: "custom",
  });
}

beforeEach(async () => {
  await backend.resetDemoData!();
});

describe("bounded diary range is scoped and lossless", () => {
  it("loads a date range in order and includes both boundaries", async () => {
    await backend.signUp(firstUser, "preview password", "Person One", "MM-DEMO");
    await addFor("2026-11-01", "Before range");
    await addFor("2026-11-02", "First day");
    await addFor("2026-11-03", "Middle day");
    await addFor("2026-11-05", "Last day");
    await addFor("2026-11-06", "After range");
    const entries = await backend.getDiaryRange("2026-11-02", "2026-11-05");
    expect(entries.map((entry) => entry.name)).toEqual(["First day", "Middle day", "Last day"]);
    const individualDays = (await Promise.all(
      ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"].map((date) => backend.getDiary(date)),
    )).flat();
    expect(entries.map((entry) => entry.id)).toEqual(individualDays.map((entry) => entry.id));
  });

  it("does not return other users' entries even for overlapping dates", async () => {
    await backend.signUp(firstUser, "preview password", "Person One", "MM-DEMO");
    const privateEntry = await addFor("2026-11-03", "Private meal");
    await backend.signOut();
    await backend.signUp(secondUser, "preview password", "Person Two", "MM-DEMO");
    const own = await addFor("2026-11-03", "Own meal");
    const visible = await backend.getDiaryRange("2026-11-01", "2026-11-06");
    expect(visible.map((entry) => entry.id)).toEqual([own.id]);
    expect(visible.map((entry) => entry.id)).not.toContain(privateEntry.id);
  });

  it("rejects reversed dates", async () => {
    await backend.signUp(firstUser, "preview password", "Person One", "MM-DEMO");
    await expect(backend.getDiaryRange("2026-11-06", "2026-11-01")).rejects.toThrow();
  });
});
