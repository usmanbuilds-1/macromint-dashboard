BEGIN;
-- 0018: Independent, atomic and bounded recipe-page import budget.
-- Service-role only. Requires production egress policy approval before
-- RECIPE_IMPORT_ENABLED and RECIPE_IMPORT_EGRESS_APPROVED are set.
CREATE TABLE IF NOT EXISTS public.recipe_import_budgets (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0 CHECK (hits BETWEEN 0 AND 8),
  PRIMARY KEY(user_id,window_start)
);
ALTER TABLE public.recipe_import_budgets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.recipe_import_budgets FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.recipe_import_budgets TO service_role;

CREATE OR REPLACE FUNCTION public.consume_recipe_import_budget(p_user uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_catalog AS $$
DECLARE n integer;
BEGIN
  IF p_user IS NULL THEN RETURN false; END IF;
  -- A cheap bounded cleanup keeps this tiny table from growing forever.
  DELETE FROM public.recipe_import_budgets WHERE window_start < now()-interval '7 days';
  INSERT INTO public.recipe_import_budgets(user_id,window_start,hits)
  VALUES(p_user,date_trunc('hour',now()),1)
  ON CONFLICT (user_id,window_start)
  DO UPDATE SET hits=public.recipe_import_budgets.hits+1
    WHERE public.recipe_import_budgets.hits < 8
  RETURNING hits INTO n;
  RETURN n IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.consume_recipe_import_budget(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_recipe_import_budget(uuid) TO service_role;
COMMIT;
