import { useSyncExternalStore } from "react";
import { getDataVersion, subscribeData } from "@/lib/backend";

export { useAsyncData } from "./useCachedData";

/** Retained for local, mutation-triggered calculations that genuinely need
 * to recompute. API queries use the separate account-scoped React Query cache.
 */
export function useDataVersion(): number {
  return useSyncExternalStore(subscribeData, getDataVersion, getDataVersion);
}
