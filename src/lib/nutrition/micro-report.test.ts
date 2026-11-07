import { describe, expect, it } from "vitest";
import type { DiaryEntry } from "@/types";
import { microReport } from "./micro-report";
const e = (id: string, nutrients: DiaryEntry["nutrients"]) => ({ id, name: "Food " + id, nutrients } as DiaryEntry);
describe("micronutrients without invented zeros", () => {
  it("shows a known partial sum without pretending completeness", () => {
    const report = microReport([e("1", { iron: 4 }), e("2", { iron: null }), e("3", { iron: 0 })], "iron");
    expect(report).toMatchObject({ knownTotal: 4, knownEntries: 2, missingEntries: 1, complete: false });
    expect(report.contributors).toHaveLength(1);
  });
  it("doesn't invent a total when no values exist", () => {
    expect(microReport([e("1", {})], "vitaminB12").knownTotal).toBeNull();
  });
});
