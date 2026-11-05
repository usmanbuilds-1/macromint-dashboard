BEGIN;

-- 0012: Atomically issue/revoke private beta invitations with admin audit.
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
    (SELECT 1 FROM public.admin_users WHERE user_id = p_admin) THEN
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
    (SELECT 1 FROM public.admin_users WHERE user_id = p_admin) THEN
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
