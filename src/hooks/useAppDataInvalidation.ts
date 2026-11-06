import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/context/Session";
import { subscribeData } from "@/lib/backend";

/** One subscription for the authenticated shell. On any completed mutation,
 * mark its active account queries stale and revalidate in the background.
 * Existing values remain visible during the fetch (no tab flash).
 */
export function useAppDataInvalidation() {
  const client = useQueryClient();
  const { user } = useSession();
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    return subscribeData(() => {
      void client.invalidateQueries({
        queryKey: ["app-data", userId],
        refetchType: "active",
      });
    });
  }, [client, userId]);
}
