// Deprecated: Macro Mint does not import recipes from website URLs.
// Keep a non-fetching endpoint until all deployed clients and functions are
// confirmed removed. Even legacy RECIPE_IMPORT_ENABLED=true has no effect.
import { errorResponse, preflight } from "../_shared/http.ts";

Deno.serve((request) => {
  const pre = preflight(request);
  if (pre) return pre;
  return errorResponse(
    "GONE",
    "Recipe link importing was retired. Paste your ingredient list in Foods → Recipes instead.",
    410,
  );
});
