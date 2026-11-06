import { getSupabase } from "@/lib/supabase";
import { BackendError } from "../types";
import type { DiaryEntry } from "@/types";

const PAGE_SIZE = 500;

/** Read one bounded date interval through RLS; paginate instead of silently
 * truncating when the account has more than PostgREST's default row cap.
 * No client-wide cache and no cross-account or service-role access. */
export async function selectDiaryRange(
  userId: string, startDate: string, endDate: string,
  mapEntry: (row: Record<string, unknown>) => DiaryEntry,
): Promise<DiaryEntry[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) {
    throw new BackendError("VALIDATION", "Invalid diary date range");
  }
  const entries: DiaryEntry[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await getSupabase().from("diary_entries")
      .select("*").eq("user_id", userId)
      .gte("entry_date", startDate).lte("entry_date", endDate)
      .order("entry_date", { ascending: true })
      .order("logged_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new BackendError("DB", error.message);
    const page = data ?? [];
    entries.push(...page.map(mapEntry));
    if (page.length < PAGE_SIZE) break;
  }
  return entries;
}
