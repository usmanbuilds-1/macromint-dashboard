import type { AdminUserRow } from "@/types";
import { summarizeEngagement } from "./engagement";

/** Snapshot from the existing owner-authorized, bounded user listing.
 * Never present these counts as true D1/D7 cohort retention. */
export function EngagementSummary({ users }: { users: AdminUserRow[] }) {
  const report = summarizeEngagement(users);
  return (
    <details className="border-b pb-3" aria-label="Tester engagement snapshot">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-foreground">Tester engagement snapshot</summary>
      <p className="mt-2 text-sm text-muted-foreground">
        {report.testersWithDatedEntries30d} of {report.testers} testers have food entries dated within the last 30 days.
        {report.testersWithoutDatedEntries30d > 0 && ` ${report.testersWithoutDatedEntries30d} have none in that window.`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Across {report.accounts} returned accounts: {report.accountsWithDatedEntries30d} have dated entries within 30 days; {report.recentSignups7d} joined in the past 7 days.
        Based on at most 200 returned accounts. This is not first-log activation, app-open activity or D1/D7 retention.
      </p>
    </details>
  );
}
