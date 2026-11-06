export const APP_DATA_STALE_MS = 45_000;
export const APP_DATA_GC_MS = 5 * 60_000;

/** Shared cache key builder. A single account id + resource + all inputs
 * ensures prefetching and mounted screens read the exact same cache entry. */
export function appDataKey(
  userId: string,
  resource: string,
  deps: readonly (string | number | boolean | null | undefined)[] = [],
) {
  return ["app-data", userId, resource, ...deps] as const;
}
