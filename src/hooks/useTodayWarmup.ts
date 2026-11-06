import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useSession } from "@/context/Session";
import { backend } from "@/lib/backend";
import { todayStr } from "@/lib/nutrition/datetime";
import type { DiaryEntry, WaterEntry } from "@/types";
import { appDataKey, APP_DATA_GC_MS, APP_DATA_STALE_MS } from "./app-data-key";

type TodayLoaders = {
  diary: () => Promise<DiaryEntry[]>;
  water: () => Promise<WaterEntry[]>;
};

/** Warm today's two small, RLS-protected reads before the user taps Today.
 * These keys are identical to useAsyncData in Today and Diary. React Query
 * deduplicates any request that is already in flight.
 */
export async function warmTodayQueries(
  client: QueryClient,
  userId: string,
  day: string,
  loaders: TodayLoaders,
): Promise<void> {
  await Promise.all([
    client.prefetchQuery({
      queryKey: appDataKey(userId, "diary:day", [day]),
      queryFn: loaders.diary,
      staleTime: APP_DATA_STALE_MS,
      gcTime: APP_DATA_GC_MS,
      retry: false,
    }),
    client.prefetchQuery({
      queryKey: appDataKey(userId, "water:day", [day]),
      queryFn: loaders.water,
      staleTime: APP_DATA_STALE_MS,
      gcTime: APP_DATA_GC_MS,
      retry: false,
    }),
  ]);
}

/** Run after initial paint so normal navigation gets first priority.
 * Never prefetch without an authenticated, access-gated AppLayout.
 */
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
        water: () => backend.getWater(day),
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [client, userId]);
}
