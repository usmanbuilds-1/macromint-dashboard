import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Warm route chunks on touch/hover so taps don't wait for dynamic imports.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 60_000,
  });

  return router;
};
