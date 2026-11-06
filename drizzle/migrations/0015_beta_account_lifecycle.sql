BEGIN;

-- 0015: Restricted account lifecycle and private beta reactivation queue.
-- Apply AFTER 0014 on the same verified Cloud database.
-- No paid-subscription behavior is introduced.
-- Existing JWTs remain cryptographically valid until expiry; protected product
-- requests continue to consult this revocation-aware entitlement function.
CREATE OR REPLACE FUNCTION public.has_access(uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements e WHERE e.user_id = uid
      AND e.state NOT IN ('revoked','suspended','trial_expired','payment_overdue')
      AND (
        e.state IN ('paid_active','complimentary')
        OR (e.state = 'trial_active' AND e.trial_ends_at > now())
        OR (e.access_until IS NOT NULL AND e.access_until > now())
      )
  );
$$;

-- The first private beta has a single verified owner; generic administrator
-- records do not grant platform control through the client-side role RPC.
CREATE OR REPLACE FUNCTION public.am_i_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role='owner'
  );
$$;

CREATE TABLE IF NOT EXISTS public.beta_reactivation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','denied')),
  message text NOT NULL DEFAULT '' CHECK (char_length(message) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_reason text CHECK (owner_reason IS NULL OR char_length(owner_reason) <= 1000),
  approved_days integer CHECK (approved_days IS NULL OR approved_days BETWEEN 1 AND 90)
);
CREATE UNIQUE INDEX IF NOT EXISTS beta_one_pending_per_user
ON public.beta_reactivation_requests(user_id) WHERE status='pending';
CREATE INDEX IF NOT EXISTS beta_reactivation_recent
ON public.beta_reactivation_requests(created_at DESC);

ALTER TABLE public.beta_reactivation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.beta_reactivation_requests FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.beta_reactivation_requests TO service_role;

CREATE OR REPLACE FUNCTION public.beta_submit_reactivation(
  p_user uuid, p_message text DEFAULT ''
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_catalog AS $$
DECLARE
  v_request public.beta_reactivation_requests%rowtype;
BEGIN
  IF p_user IS NULL OR char_length(coalesce(p_message,'')) > 500 THEN
    RAISE EXCEPTION 'Invalid request';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.beta_invite_redemptions
                 WHERE user_id=p_user)
     OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id=p_user) THEN
    RAISE EXCEPTION 'Private beta tester account required';
  END IF;
  IF public.has_access(p_user) THEN
    RAISE EXCEPTION 'Account already has active access';
  END IF;

  SELECT * INTO v_request FROM public.beta_reactivation_requests
  WHERE user_id=p_user AND status='pending';
  IF FOUND THEN
    RETURN jsonb_build_object('id',v_request.id,'status',v_request.status,
                               'created_at',v_request.created_at);
  END IF;

  -- Prevent repeated denial-and-resubmission abuse.
  IF (SELECT count(*) FROM public.beta_reactivation_requests
      WHERE user_id=p_user AND created_at > now()-interval '24 hours') >= 2 THEN
    RAISE EXCEPTION 'Too many recent requests';
  END IF;

  INSERT INTO public.beta_reactivation_requests(user_id,message)
  VALUES (p_user,btrim(coalesce(p_message,'')))
  ON CONFLICT DO NOTHING RETURNING * INTO v_request;

  IF v_request.id IS NULL THEN
    SELECT * INTO v_request FROM public.beta_reactivation_requests
    WHERE user_id=p_user AND status='pending';
  END IF;
  RETURN jsonb_build_object('id',v_request.id,'status',v_request.status,
                             'created_at',v_request.created_at);
END;
$$;
REVOKE ALL ON FUNCTION public.beta_submit_reactivation(uuid,text) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.beta_submit_reactivation(uuid,text) TO service_role;

-- Atomic decision: mutate request, entitlement and audit in one transaction.
CREATE OR REPLACE FUNCTION public.beta_review_reactivation(
  p_owner uuid, p_request uuid, p_approve boolean,
  p_days integer, p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_catalog AS $$
DECLARE
  v_request public.beta_reactivation_requests%rowtype;
  v_old_state text;
  v_new_state text;
BEGIN
  IF p_owner IS NULL OR NOT EXISTS
    (SELECT 1 FROM public.admin_users WHERE user_id=p_owner AND role='owner')
    OR p_request IS NULL OR p_approve IS NULL
    OR char_length(btrim(coalesce(p_reason,''))) < 3
    OR char_length(p_reason)>1000 THEN
    RAISE EXCEPTION 'Invalid owner review';
  END IF;
  IF p_approve AND (p_days IS NULL OR p_days NOT BETWEEN 1 AND 90) THEN
    RAISE EXCEPTION 'Approval must specify a 1 to 90 day tester extension';
  END IF;

  SELECT * INTO v_request FROM public.beta_reactivation_requests
   WHERE id=p_request FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'No pending request found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.beta_invite_redemptions
                 WHERE user_id=v_request.user_id)
     OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id=v_request.user_id) THEN
    RAISE EXCEPTION 'Target is not an eligible tester';
  END IF;
  SELECT state INTO v_old_state FROM public.entitlements
   WHERE user_id=v_request.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entitlement missing'; END IF;

  v_new_state := v_old_state;
  IF p_approve THEN
    UPDATE public.entitlements
      SET state='trial_active', trial_ends_at=now()+make_interval(days=>p_days),
          access_until=NULL, updated_at=now()
      WHERE user_id=v_request.user_id;
    v_new_state := 'trial_active';
  END IF;

  UPDATE public.beta_reactivation_requests
    SET status=CASE WHEN p_approve THEN 'approved' ELSE 'denied' END,
        reviewed_at=now(), reviewed_by=p_owner,
        owner_reason=btrim(p_reason),
        approved_days=CASE WHEN p_approve THEN p_days ELSE NULL END
    WHERE id=p_request;

  INSERT INTO public.admin_audit_logs
    (admin_id,target_user_id,action,previous_state,new_state,reason,metadata)
  VALUES
    (p_owner,v_request.user_id,
     CASE WHEN p_approve THEN 'approve_beta_reactivation' ELSE 'deny_beta_reactivation' END,
     v_old_state,v_new_state,btrim(p_reason),
     jsonb_build_object('request_id',v_request.id,
                        'approved_days',CASE WHEN p_approve THEN p_days ELSE NULL END));

  RETURN jsonb_build_object('ok',true,'status',CASE WHEN p_approve THEN 'approved' ELSE 'denied' END);
END;
$$;
REVOKE ALL ON FUNCTION public.beta_review_reactivation(uuid,uuid,boolean,integer,text)
FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.beta_review_reactivation(uuid,uuid,boolean,integer,text)
TO service_role;
COMMIT;
