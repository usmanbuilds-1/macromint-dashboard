BEGIN;

-- 0013 — Expose only the genuinely public configuration fields via a
-- signed-in read-only RPC, not the entire app_settings record.
-- Apply AFTER the frontend that uses get_public_app_settings has been built
-- and published; until then the legacy app_settings SELECT policy remains
-- necessary for old clients. No personal or account data are returned.

CREATE OR REPLACE FUNCTION public.get_public_app_settings()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT to_jsonb(public_settings)
  FROM (
    SELECT trial_days, reward_access_hours, max_daily_rewarded_ads
    FROM public.app_settings WHERE id = 1
  ) AS public_settings;
$$;

REVOKE ALL ON FUNCTION public.get_public_app_settings()
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_app_settings()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_app_settings()
  TO service_role;

-- Keep admin access to the full settings table, but remove universal
-- authenticated direct SELECT after the updated frontend is live.
-- Existing admin-query and admin-action Edge functions use service_role.
DROP POLICY IF EXISTS "app_settings read" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings admin read" ON public.app_settings;
CREATE POLICY "app_settings admin read" ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.is_admin());

COMMIT;
