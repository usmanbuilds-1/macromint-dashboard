import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useSession } from "@/context/Session";
import { backend } from "@/lib/backend";
import { todayStr } from "@/lib/nutrition/datetime";
import type { DiaryEntry } from "@/types";
import { appDataKey, APP_DATA_GC_MS, APP_DATA_STALE_MS } from "./app-data-key";

type TodayLoaders = { diary: () => Promise<DiaryEntry[]> };

/** Warm only the critical food diary. Water is an optional disclosure and
 * must not make a second API call on every signed-in app load.
 * React Query reuses this account-scoped key for Today and Diary.
 */
export async function warmTodayQueries(
  client: QueryClient,
  userId: string,
  day: string,
  loaders: TodayLoaders,
): Promise<void> {
  await client.prefetchQuery({
    queryKey: appDataKey(userId, "diary:day", [day]),
    queryFn: loaders.diary,
    staleTime: APP_DATA_STALE_MS,
    gcTime: APP_DATA_GC_MS,
    retry: false,
  });
}

export function useTodayWarmup(): void {
  const client = useQueryClient();
  const { user } = useSession();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const frame = window.requestAnimationFrame(() => {
      if (document.hidden) return;
      const day = todayStr();
      void warmTodayQueries(client, userId, day, {
        diary: () => backend.getDiary(day),
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [client, userId]);
}
