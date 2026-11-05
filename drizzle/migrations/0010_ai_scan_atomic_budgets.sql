-- 0010: Atomic per-user AI scan attempt budgets. MANUAL CLOUD SQL MIGRATION.
-- Do not deploy the ai-scan Edge bundle using this RPC until this migration
-- has been applied and verified in the same environment.
--
-- Charge attempts BEFORE calling an AI provider, including failed requests.
-- This prevents an invalid/broken provider or concurrent calls from exhausting
-- the owner's key without counting toward quotas. UTC fixed windows:
-- maximum 6 attempted scans / minute and 40 / day per authenticated user.
-- The existing scan_events table continues to record completed scans separately.

CREATE TABLE IF NOT EXISTS public.ai_scan_attempt_budgets (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('minute', 'day')),
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts BETWEEN 1 AND 1000),
  PRIMARY KEY (user_id, scope, window_start)
);

CREATE INDEX IF NOT EXISTS ai_scan_attempt_budgets_window_idx
  ON public.ai_scan_attempt_budgets (window_start);

ALTER TABLE public.ai_scan_attempt_budgets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_scan_attempt_budgets FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_scan_attempt_budgets TO service_role;

CREATE OR REPLACE FUNCTION public.consume_ai_scan_budget(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  minute_window timestamptz := date_trunc('minute', clock_timestamp());
  day_window timestamptz := date_trunc('day', clock_timestamp());
  minute_count integer;
  day_count integer;
BEGIN
  IF p_user_id IS NULL THEN RETURN 'unavailable'; END IF;
  -- Serialize parallel scans from the same account. A hash collision can only
  -- make an unrelated request wait, not share counters or grant quota.
  PERFORM pg_advisory_xact_lock(hashtextextended('macromint:scan:' || p_user_id::text, 0));

  SELECT attempts INTO day_count
  FROM public.ai_scan_attempt_budgets
  WHERE user_id = p_user_id AND scope = 'day' AND window_start = day_window;
  IF coalesce(day_count, 0) >= 40 THEN RETURN 'day'; END IF;

  SELECT attempts INTO minute_count
  FROM public.ai_scan_attempt_budgets
  WHERE user_id = p_user_id AND scope = 'minute' AND window_start = minute_window;
  IF coalesce(minute_count, 0) >= 6 THEN RETURN 'minute'; END IF;

  INSERT INTO public.ai_scan_attempt_budgets AS r(user_id, scope, window_start, attempts)
  VALUES (p_user_id, 'minute', minute_window, 1)
  ON CONFLICT (user_id, scope, window_start) DO UPDATE
    SET attempts = r.attempts + 1;

  INSERT INTO public.ai_scan_attempt_budgets AS r(user_id, scope, window_start, attempts)
  VALUES (p_user_id, 'day', day_window, 1)
  ON CONFLICT (user_id, scope, window_start) DO UPDATE
    SET attempts = r.attempts + 1;

  RETURN 'allowed';
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_scan_budget(uuid)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_scan_budget(uuid) TO service_role;

-- Manual maintenance: DELETE FROM public.ai_scan_attempt_budgets
-- WHERE window_start < now() - interval '3 days';
