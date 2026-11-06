import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

const PRIMARY_TABS = ["/today", "/diary", "/foods", "/trends"] as const;

/** Load only the route code while the browser is idle, not its data.
 * Mobile taps won't need to download their React page for the first time.
 * Sequential preloads avoid flooding low-bandwidth connections.
 */
export function usePrimaryRoutePreload(): void {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    const warmTabs = async () => {
      if (cancelled || document.hidden) return;
      for (const to of PRIMARY_TABS) {
        if (cancelled || document.hidden) return;
        try {
          await router.preloadRoute({ to });
        } catch {
          // Navigation is still fully functional if a speculative preload fails.
        }
      }
    };

    let idleId: number | null = null;
    let timeoutId: number | null = null;
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => { void warmTabs(); }, { timeout: 2500 });
    } else {
      timeoutId = window.setTimeout(() => { void warmTabs(); }, 1000);
    }
    return () => {
      cancelled = true;
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [router]);
}
