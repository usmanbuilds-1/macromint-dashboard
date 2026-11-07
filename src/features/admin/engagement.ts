import type { AdminUserRow } from "@/types";

export interface EngagementSnapshot {
  accounts: number;
  accountsWithDatedEntries30d: number;
  testers: number;
  testersWithDatedEntries30d: number;
  testersWithoutDatedEntries30d: number;
  recentSignups7d: number;
}

/** Reads only the already authorized owner account list. No food names,
 *  personal nutrition, cross-account queries, or client-side tracking.
 *  This is a diagnostic snapshot, NOT D1/D7 retention or activation. */
export function summarizeEngagement(users: AdminUserRow[], now = new Date()): EngagementSnapshot {
  const sevenDaysAgo = now.getTime() - 7 * 86_400_000;
  const testers = users.filter((row) => row.isBetaTester);
  const hasDatedEntry = (row: AdminUserRow) => row.diaryCount30d > 0;
  return {
    accounts: users.length,
    accountsWithDatedEntries30d: users.filter(hasDatedEntry).length,
    testers: testers.length,
    testersWithDatedEntries30d: testers.filter(hasDatedEntry).length,
    testersWithoutDatedEntries30d: testers.filter((row) => !hasDatedEntry(row)).length,
    recentSignups7d: users.filter((row) => {
      const createdAt = Date.parse(row.createdAt);
      return Number.isFinite(createdAt) && createdAt >= sevenDaysAgo && createdAt <= now.getTime();
    }).length,
  };
}
