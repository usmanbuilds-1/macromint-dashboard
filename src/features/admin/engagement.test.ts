import { describe, expect, it } from "vitest";
import type { AdminUserRow } from "@/types";
import { summarizeEngagement } from "./engagement";

const row = (fields: Partial<AdminUserRow>): AdminUserRow => ({
  userId: "user-id", email: "user@example.com", name: "Tester",
  isBetaTester: false, createdAt: "2026-11-01T12:00:00Z",
  diaryCount30d: 0, lastDiaryDate: null, entitlement: null, ...fields,
});

describe("admin engagement snapshot", () => {
  it("separates all users from beta testers and never invents retention", () => {
    const users = [
      row({ userId: "1", isBetaTester: true, diaryCount30d: 3 }),
      row({ userId: "2", isBetaTester: true, diaryCount30d: 0 }),
      row({ userId: "3", isBetaTester: false, diaryCount30d: 10, createdAt: "2026-10-01T12:00:00Z" }),
    ];
    expect(summarizeEngagement(users, new Date("2026-11-07T12:00:00Z"))).toEqual({
      accounts: 3, accountsWithDatedEntries30d: 2,
      testers: 2, testersWithDatedEntries30d: 1,
      testersWithoutDatedEntries30d: 1, recentSignups7d: 2,
    });
  });
  it("handles empty cohorts and invalid dates without division by zero", () => {
    expect(summarizeEngagement([row({ createdAt: "invalid" })], new Date("2026-11-07T00:00:00Z")).recentSignups7d).toBe(0);
    expect(summarizeEngagement([], new Date("2026-11-07T00:00:00Z")).testers).toBe(0);
  });
});
