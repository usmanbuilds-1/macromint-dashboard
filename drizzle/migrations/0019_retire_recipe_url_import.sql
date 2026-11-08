BEGIN;
-- Retire URL imports, leaving recipes and all user nutrition data intact.
-- This table held only per-hour URL import counters, not foods or recipes.
DROP FUNCTION IF EXISTS public.consume_recipe_import_budget(uuid);
DROP TABLE IF EXISTS public.recipe_import_budgets;
COMMIT;
