BEGIN;

-- 0016: Public username registration alongside private beta invitations.
-- Run only AFTER 0014 and 0015. Rollback on any error.
--
-- Do not drop invitation tables or entitlement history. Ordinary accounts
-- start the configured standard trial; only redeemed beta invitations grant
-- tester status for the owner-only extension system.
--
-- IMPORTANT: direct Supabase auth.signUp() MUST remain rejected. The public
-- path requires a short-lived, single-use secret created only by our trusted
-- rate-limited username-register Edge Function, including for invited testers. No flag enables user signups
-- by itself, and end users never receive this signup ticket.

CREATE TABLE IF NOT EXISTS public.public_signup_tickets (
  ticket_hash text PRIMARY KEY CHECK (ticket_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS public_signup_tickets_expiry
 ON public.public_signup_tickets(expires_at);
ALTER TABLE public.public_signup_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.public_signup_tickets FROM public,anon,authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.public_signup_tickets TO service_role;

-- The caller supplies only a SHA-256 hash of a randomly generated 256-bit
-- token. The plaintext token is never stored, returned or exposed in JSON.
CREATE OR REPLACE FUNCTION public.issue_public_signup_ticket(p_hash text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
BEGIN
  IF p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid signup token digest';
  END IF;
  INSERT INTO public.public_signup_tickets(ticket_hash,expires_at)
    VALUES (p_hash, now() + interval '2 minutes');
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_public_signup_ticket(text)
 FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.issue_public_signup_ticket(text) TO service_role;

-- Keep the original trigger name so existing Cloud auth setup is preserved.
-- When a private invitation is given, verify and redeem it atomically.
-- Otherwise, require an unguessable, one-use ticket issued after server-side
-- registration throttling. User-supplied metadata cannot self-authorize.
CREATE OR REPLACE FUNCTION public.beta_require_invite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  submitted_code text;
  submitted_ticket text;
  invitation_id uuid;
  ticket_digest text;
  account_name text;
BEGIN
  submitted_code := upper(btrim(coalesce(new.raw_user_meta_data->>'beta_invite_code','')));
  submitted_ticket := coalesce(new.raw_user_meta_data->>'public_signup_ticket','');
  account_name := btrim(coalesce(new.raw_user_meta_data->>'name',''));

  IF char_length(account_name) < 2 OR char_length(account_name) > 100
     OR submitted_ticket !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'A server-authorized signup is required' USING ERRCODE='P0001';
  END IF;

  -- Every registration must consume a one-time ticket minted by the
  -- rate-limited Edge handler, including accounts holding an invitation.
  ticket_digest := encode(pg_catalog.sha256(
    convert_to(submitted_ticket,'UTF8')),'hex');
  UPDATE public.public_signup_tickets SET consumed_at=now()
   WHERE ticket_hash=ticket_digest AND consumed_at IS NULL
     AND expires_at > now();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired signup authorization' USING ERRCODE='P0001';
  END IF;

  -- Never trust client-provided beta identifiers. Only verified invitations
  -- can attach beta_invite_id to the new auth identity.
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data,'{}'::jsonb)
     - 'beta_invite_code' - 'beta_invite_id' - 'public_signup_ticket';

  IF submitted_code <> '' THEN
    IF submitted_code !~ '^MM-[A-F0-9]{40}$' THEN
      RAISE EXCEPTION 'Invalid signup authorization' USING ERRCODE='P0001';
    END IF;

    UPDATE public.beta_invites
       SET used_count = used_count + 1
     WHERE code_hash = encode(
       pg_catalog.sha256(convert_to(lower(submitted_code),'UTF8')), 'hex')
       AND expires_at > now() AND revoked_at IS NULL
       AND used_count < max_uses
     RETURNING id INTO invitation_id;

    IF invitation_id IS NULL THEN
      RAISE EXCEPTION 'Invalid or unavailable invitation' USING ERRCODE='P0001';
    END IF;
    new.raw_user_meta_data := new.raw_user_meta_data
      || jsonb_build_object('beta_invite_id',invitation_id::text);
  END IF;

  RETURN new;
END;
$$;

-- Ordinary registrants intentionally DO NOT receive tester status.
CREATE OR REPLACE FUNCTION public.beta_record_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  invitation_id text;
BEGIN
  invitation_id := new.raw_user_meta_data->>'beta_invite_id';
  IF invitation_id IS NOT NULL THEN
    INSERT INTO public.beta_invite_redemptions(invite_id,user_id)
      VALUES (invitation_id::uuid,new.id);
  END IF;
  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.beta_require_invite(), public.beta_record_signup()
 FROM public,anon,authenticated;

-- Protect against trigger removal/misconfiguration; do not automatically
-- replace active triggers from prior migrations.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
    WHERE tgrelid='auth.users'::regclass AND tgname='beta_check_before_signup'
      AND NOT tgisinternal)
    OR NOT EXISTS (SELECT 1 FROM pg_trigger
    WHERE tgrelid='auth.users'::regclass AND tgname='beta_record_after_signup'
      AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Existing invite admission triggers are missing';
  END IF;
END $$;

COMMIT;
