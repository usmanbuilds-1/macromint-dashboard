BEGIN;

-- 0014 is additive/replace-only and depends on 0006 and 0010–0013.
-- The existing 0011/0012 function signatures/grants stay unchanged.
-- Do not reapply older migrations to production.

-- 0014: Harden existing owner actions and keep beta trial extensions tester-only. Original 0011 made every entitlement/config mutation and its audit event
-- atomic in the database. MANUAL CLOUD SQL MIGRATION (after 0010).
-- Old Edge admin-action updates then inserts an audit record separately,
-- silently allowing an unlogged change when the audit insert fails.
--
-- Service-role-only. The Edge Function validates the bearer token; the SQL
-- functions independently verify that p_admin belongs to admin_users.
-- Use with the accompanying admin-action Edge bundle in the same release.

CREATE OR REPLACE FUNCTION public.admin_change_entitlement(
  p_admin uuid, p_target uuid, p_action text,
  p_days integer DEFAULT NULL, p_date text DEFAULT NULL,
  p_state text DEFAULT NULL, p_reason text DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  old_record public.entitlements%rowtype;
  new_record public.entitlements%rowtype;
  v_state text;
  v_trial_end timestamptz;
  v_access_until timestamptz;
  v_date timestamptz;
BEGIN
  IF p_admin IS NULL OR NOT EXISTS
    (SELECT 1 FROM public.admin_users WHERE user_id = p_admin AND role = 'owner') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF p_target IS NULL OR p_action IS NULL OR length(p_action) > 32
     OR length(coalesce(p_reason, '')) > 1000
     OR length(coalesce(p_note, '')) > 1000 THEN
    RAISE EXCEPTION 'Invalid admin action';
  END IF;

  -- Paid plans are deliberately outside the beta trial adjustment system.
  IF p_action <> 'add_note' AND char_length(btrim(coalesce(p_reason,''))) < 3 THEN
    RAISE EXCEPTION 'A mandatory audit reason is required';
  END IF;
  IF p_action IN ('extend_trial','shorten_trial','set_expiry') AND (
    NOT EXISTS (SELECT 1 FROM public.beta_invite_redemptions WHERE user_id = p_target)
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_target)
  ) THEN
    RAISE EXCEPTION 'Trial adjustments are for invited testers only';
  END IF;
  -- Never use an ordinary access mutation to disable the platform's owner.
  IF p_action IN ('revoke_access','suspend') AND EXISTS
    (SELECT 1 FROM public.admin_users WHERE user_id = p_target AND role = 'owner') THEN
    RAISE EXCEPTION 'Cannot disable an owner account';
  END IF;

  SELECT * INTO old_record FROM public.entitlements
  WHERE user_id = p_target FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entitlement record not found'; END IF;

  v_state := old_record.state;
  v_trial_end := old_record.trial_ends_at;
  v_access_until := old_record.access_until;

  CASE p_action
    WHEN 'grant_access' THEN
      v_state := 'complimentary'; -- owner grant is not evidence of a successful payment
      v_access_until := NULL;
    WHEN 'grant_complimentary' THEN
      v_state := 'complimentary';
      v_access_until := NULL;
    WHEN 'revoke_access' THEN
      v_state := 'revoked';
    WHEN 'restore_access' THEN
      IF p_state IS NULL OR p_state NOT IN ('complimentary', 'trial_active') THEN
        RAISE EXCEPTION 'Invalid restored access state';
      END IF;
      v_state := p_state;
      IF v_state = 'trial_active' AND v_trial_end <= now() THEN
        RAISE EXCEPTION 'Cannot restore an expired trial as active';
      END IF;
    WHEN 'extend_trial', 'shorten_trial' THEN
      IF p_days IS NULL OR p_days < 1 OR p_days > 365 THEN
        RAISE EXCEPTION 'Trial adjustment must be between 1 and 365 days';
      END IF;
      v_trial_end := greatest(old_record.trial_ends_at, now())
        + CASE WHEN p_action = 'extend_trial' THEN p_days ELSE -p_days END
          * interval '1 day';
      IF old_record.state NOT IN ('revoked','suspended') THEN
        v_state := CASE WHEN v_trial_end >= now() THEN 'trial_active'
                        ELSE 'trial_expired' END;
      END IF;
    WHEN 'set_expiry' THEN
      IF p_date IS NULL OR p_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
        RAISE EXCEPTION 'Expiry must be a YYYY-MM-DD date';
      END IF;
      BEGIN v_date := (p_date::date + interval '1 day' - interval '1 second'); EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'Invalid expiry date';
      END;
      v_trial_end := v_date;
      IF old_record.state IN ('trial_active','trial_expired') THEN
        v_state := CASE WHEN v_trial_end >= now() THEN 'trial_active'
                        ELSE 'trial_expired' END;
      END IF;
    WHEN 'suspend' THEN v_state := 'suspended';
    WHEN 'reactivate' THEN
      IF v_trial_end <= now() THEN
        RAISE EXCEPTION 'Expired tester requires an explicit, dated extension';
      END IF;
      v_state := 'trial_active';
    WHEN 'add_note' THEN NULL;
    ELSE RAISE EXCEPTION 'Unknown admin action';
  END CASE;

  IF p_action <> 'add_note' THEN
    UPDATE public.entitlements
    SET state = v_state, trial_ends_at = v_trial_end,
        access_until = v_access_until, updated_at = now()
    WHERE user_id = p_target
    RETURNING * INTO new_record;
  ELSE
    new_record := old_record;
  END IF;

  INSERT INTO public.admin_audit_logs
    (admin_id, target_user_id, action, previous_state, new_state, reason, metadata)
  VALUES
    (p_admin, p_target, p_action, old_record.state,
     CASE WHEN p_action = 'add_note' THEN NULL ELSE v_state END,
     coalesce(p_reason, p_note),
     jsonb_build_object('trial_ends_at',v_trial_end,
                        'access_until',v_access_until,
                        'note',CASE WHEN p_action='add_note' THEN p_note ELSE NULL END));
  -- If audit insertion fails, PostgreSQL rolls the entitlement update back.
  RETURN to_jsonb(new_record);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_change_entitlement(uuid,uuid,text,integer,text,text,text,text)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_entitlement(uuid,uuid,text,integer,text,text,text,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.admin_set_app_config(
  p_admin uuid, p_action text,
  p_days integer DEFAULT NULL,
  p_hours numeric DEFAULT NULL,
  p_ads integer DEFAULT NULL,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE new_settings public.app_settings%rowtype;
BEGIN
  IF p_admin IS NULL OR NOT EXISTS
    (SELECT 1 FROM public.admin_users WHERE user_id = p_admin AND role = 'owner') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF length(coalesce(p_reason,'')) > 1000 THEN
    RAISE EXCEPTION 'Reason is too long';
  END IF;

  IF p_action = 'set_trial_days' THEN
    IF p_days IS NULL OR p_days < 0 OR p_days > 90 THEN
      RAISE EXCEPTION 'Trial must be between 0 and 90 days';
    END IF;
    UPDATE public.app_settings SET trial_days = p_days, updated_at = now()
      WHERE id = 1 RETURNING * INTO new_settings;
  ELSIF p_action = 'set_reward_config' THEN
    IF p_hours IS NULL OR p_hours <= 0 OR p_hours > 168
       OR p_ads IS NULL OR p_ads < 0 OR p_ads > 20 THEN
      RAISE EXCEPTION 'Invalid reward settings';
    END IF;
    UPDATE public.app_settings
      SET reward_access_hours = p_hours,
          max_daily_rewarded_ads = p_ads, updated_at = now()
      WHERE id = 1 RETURNING * INTO new_settings;
  ELSE
    RAISE EXCEPTION 'Unknown config action';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'App settings not found'; END IF;

  INSERT INTO public.admin_audit_logs
    (admin_id,target_user_id,action,reason,metadata)
  VALUES
    (p_admin,p_admin,p_action,p_reason,
     jsonb_build_object('trial_days',new_settings.trial_days,
                        'reward_access_hours',new_settings.reward_access_hours,
                        'max_daily_rewarded_ads',new_settings.max_daily_rewarded_ads));
  RETURN to_jsonb(new_settings);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_app_config(uuid,text,integer,numeric,integer,text)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_app_config(uuid,text,integer,numeric,integer,text)
  TO service_role;

-- 0014: Reaffirm owner-only controls on private beta invitations with admin audit.
-- Manual Cloud SQL migration after 0010/0011; do not execute on an
-- unverified environment. Service-role-only, no client direct access.
CREATE OR REPLACE FUNCTION public.admin_create_beta_invite(
  p_admin uuid,
  p_code_hash text,
  p_expires_at timestamptz,
  p_max_uses integer,
  p_note text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE row_invite public.beta_invites%rowtype;
BEGIN
  IF p_admin IS NULL OR NOT EXISTS
    (SELECT 1 FROM public.admin_users WHERE user_id = p_admin AND role = 'owner') THEN
    RAISE EXCEPTION 'Administrator only';
  END IF;
  IF p_code_hash IS NULL OR p_code_hash !~ '^[0-9a-f]{64}$'
     OR p_expires_at IS NULL OR p_expires_at <= now()
     OR p_expires_at > now() + interval '90 days'
     OR p_max_uses IS NULL OR p_max_uses < 1 OR p_max_uses > 100
     OR char_length(coalesce(p_note, '')) > 200 THEN
    RAISE EXCEPTION 'Invalid invitation';
  END IF;

  INSERT INTO public.beta_invites
    (code_hash, created_by, expires_at, max_uses, note)
  VALUES (p_code_hash, p_admin, p_expires_at, p_max_uses, p_note)
  RETURNING * INTO row_invite;

  INSERT INTO public.admin_audit_logs
    (admin_id,target_user_id,action,metadata)
  VALUES
    (p_admin,p_admin,'create_beta_invite',
      jsonb_build_object('invite_id',row_invite.id,
                         'max_uses',row_invite.max_uses,
                         'expires_at',row_invite.expires_at));
  RETURN jsonb_build_object('id',row_invite.id,
                            'expires_at',row_invite.expires_at,
                            'max_uses',row_invite.max_uses);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_beta_invite(uuid,text,timestamptz,integer,text)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_beta_invite(uuid,text,timestamptz,integer,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.admin_revoke_beta_invite(
  p_admin uuid, p_invite_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE affected_id uuid;
BEGIN
  IF p_admin IS NULL OR NOT EXISTS
    (SELECT 1 FROM public.admin_users WHERE user_id = p_admin AND role = 'owner') THEN
    RAISE EXCEPTION 'Administrator only';
  END IF;
  IF p_invite_id IS NULL THEN RETURN false; END IF;

  UPDATE public.beta_invites SET revoked_at = now()
  WHERE id = p_invite_id AND revoked_at IS NULL
  RETURNING id INTO affected_id;
  IF affected_id IS NULL THEN RETURN false; END IF;

  INSERT INTO public.admin_audit_logs
    (admin_id,target_user_id,action,metadata)
  VALUES
    (p_admin,p_admin,'revoke_beta_invite',
     jsonb_build_object('invite_id',affected_id));
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_beta_invite(uuid,uuid)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_beta_invite(uuid,uuid)
  TO service_role;

COMMIT;
