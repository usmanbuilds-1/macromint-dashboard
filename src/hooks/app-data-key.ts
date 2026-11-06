/** Shared cache key builder. A single account id + resource + all inputs
 * ensures prefetching and mounted screens read the exact same cache entry. */
export function appDataKey(
  userId: string,
  resource: string,
  deps: readonly (string | number | boolean | null | undefined)[] = [],
) {
  return ["app-data", userId, resource, ...deps] as const;
}
