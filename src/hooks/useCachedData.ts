import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/context/Session";
import { appDataKey, APP_DATA_STALE_MS, APP_DATA_GC_MS } from "./app-data-key";

/** Reads are cached for a short window per account and logical resource.
 * Mutations call bumpData(), which invalidates active queries via
 * useAppDataInvalidation. No persistent/private localStorage cache.
 *
 * Keys must include every variable that changes the result (date, search),
 * but NOT the global mutation counter: invalidating keeps existing data
 * visible while the updated response loads.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: readonly (string | number | boolean | null | undefined)[],
  resource: string,
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const { user } = useSession();
  const query = useQuery<T, Error>({
    queryKey: appDataKey(user?.id ?? "signed-out", resource, deps),
    queryFn: loader,
    enabled: Boolean(user?.id),
    staleTime: APP_DATA_STALE_MS,
    gcTime: APP_DATA_GC_MS,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const reload = useCallback(() => { void query.refetch(); }, [query.refetch]);
  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error?.message ?? null,
    reload,
  };
}
