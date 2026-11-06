-- Run only in ephemeral PostgreSQL CI after SQL fixtures and 0010–0012.
-- These are executable behavioral checks, not just SQL string/syntax matching.
\set ON_ERROR_STOP on
\i drizzle/migrations/0014_owner_tester_access.sql
\i drizzle/migrations/0015_beta_account_lifecycle.sql

INSERT INTO auth.users(id,email) VALUES
 ('11111111-1111-4111-8111-111111111111','owner@test.invalid'),
 ('22222222-2222-4222-8222-222222222222','nonadmin@test.invalid'),
 ('33333333-3333-4333-8333-333333333333','tester@test.invalid');
INSERT INTO public.admin_users(user_id,role)
VALUES ('11111111-1111-4111-8111-111111111111','owner');
INSERT INTO public.beta_invites (id,code_hash,expires_at)
VALUES ('44444444-4444-4444-8444-444444444444',repeat('e',64),now()+interval '7 days');
INSERT INTO public.beta_invite_redemptions(invite_id,user_id)
VALUES ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333');
INSERT INTO public.app_settings(id) VALUES (1);
INSERT INTO public.entitlements(user_id,state,trial_ends_at)
VALUES ('33333333-3333-4333-8333-333333333333','trial_active',now()+interval '14 days');

DO $$
DECLARE
  owner_id uuid := '11111111-1111-4111-8111-111111111111';
  stranger_id uuid := '22222222-2222-4222-8222-222222222222';
  tester_id uuid := '33333333-3333-4333-8333-333333333333';
  i int;
  status text;
  result jsonb;
  new_invite uuid;
  n int;
  denied boolean;
BEGIN
  -- Scan quota: exactly six successful requests in one minute, then reject.
  FOR i IN 1..6 LOOP
    status := public.consume_ai_scan_budget(tester_id);
    IF status <> 'allowed' THEN
      RAISE EXCEPTION 'AI scan limit incorrectly denied attempt %: %', i, status;
    END IF;
  END LOOP;
  status := public.consume_ai_scan_budget(tester_id);
  IF status <> 'minute' THEN RAISE EXCEPTION 'AI minute limit not enforced: %', status; END IF;

  -- Simulate tomorrow/minute reset in disposable test DB: day budget prevails.
  DELETE FROM public.ai_scan_attempt_budgets
   WHERE user_id = tester_id AND scope = 'minute';
  UPDATE public.ai_scan_attempt_budgets SET attempts = 40
   WHERE user_id = tester_id AND scope = 'day';
  status := public.consume_ai_scan_budget(tester_id);
  IF status <> 'day' THEN RAISE EXCEPTION 'AI day limit not enforced: %', status; END IF;

  -- Unauthorized callers may not apply privileged access changes.
  denied := false;
  BEGIN
    PERFORM public.admin_change_entitlement(stranger_id,tester_id,'revoke_access');
  EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Non-admin changed entitlement'; END IF;

  -- Authorized access change and corresponding mandatory audit row.
  -- Only invited non-admin testers may receive an extension.
  result := public.admin_change_entitlement(owner_id,tester_id,'extend_trial',7,null,null,'Beta extension');
  IF result->>'state' <> 'trial_active' THEN
    RAISE EXCEPTION 'Tester extension failed: %', result;
  END IF;
  denied := false;
  BEGIN
    PERFORM public.admin_change_entitlement(owner_id,stranger_id,'extend_trial',7,null,null,'Unauthorized extension');
  EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Non-tester received an extension'; END IF;
  denied := false;
  BEGIN
    PERFORM public.admin_change_entitlement(owner_id,tester_id,'suspend');
  EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Suspension without a reason accepted'; END IF;

  result := public.admin_change_entitlement(owner_id,tester_id,'grant_complimentary',null,null,null,'Approved access');
  IF result->>'state' <> 'complimentary' THEN
    RAISE EXCEPTION 'Grant failed to update entitlement: %', result;
  END IF;
  SELECT count(*) INTO n FROM public.admin_audit_logs
  WHERE target_user_id=tester_id AND action='grant_complimentary';
  IF n <> 1 THEN RAISE EXCEPTION 'Grant did not produce exactly one audit row'; END IF;

  -- Platform settings update and audit must be in one SQL transaction.
  result := public.admin_set_app_config(owner_id,'set_trial_days',21,null,null,'test change');
  IF (result->>'trial_days')::int <> 21 THEN
    RAISE EXCEPTION 'Admin config update failed: %', result;
  END IF;
  SELECT count(*) INTO n FROM public.admin_audit_logs WHERE action='set_trial_days';
  IF n <> 1 THEN RAISE EXCEPTION 'Config change not audited'; END IF;

  -- Invalid config and restore-state requests must fail closed.
  denied := false;
  BEGIN
    PERFORM public.admin_set_app_config(owner_id,'set_trial_days',999,null,null,null);
  EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Invalid config unexpectedly accepted'; END IF;
  denied := false;
  BEGIN
    PERFORM public.admin_change_entitlement(owner_id,tester_id,'restore_access',null,null,null);
  EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Missing restore state was accepted'; END IF;

  -- Private invitation creation and revocation: both MUST be audited.
  result := public.admin_create_beta_invite(
    owner_id, repeat('a',64), now()+interval '7 days', 1, 'CI test');
  new_invite := (result->>'id')::uuid;
  IF new_invite IS NULL THEN RAISE EXCEPTION 'Admin invite RPC returned no ID'; END IF;
  SELECT count(*) INTO n FROM public.admin_audit_logs
  WHERE action='create_beta_invite' AND metadata->>'invite_id'=new_invite::text;
  IF n <> 1 THEN RAISE EXCEPTION 'Invite creation not audited'; END IF;
  IF NOT public.admin_revoke_beta_invite(owner_id,new_invite) THEN
    RAISE EXCEPTION 'First revoke should succeed'; END IF;
  IF public.admin_revoke_beta_invite(owner_id,new_invite) THEN
    RAISE EXCEPTION 'Repeated revoke must not succeed'; END IF;
  SELECT count(*) INTO n FROM public.admin_audit_logs
  WHERE action='revoke_beta_invite' AND metadata->>'invite_id'=new_invite::text;
  IF n <> 1 THEN RAISE EXCEPTION 'Revoke was not audited exactly once'; END IF;

  denied := false;
  BEGIN
    PERFORM public.admin_create_beta_invite(stranger_id,repeat('b',64),now()+interval '1 day',1,'no');
  EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Non-admin issued invite'; END IF;
  RAISE NOTICE 'PASS: atomic scan quota, admin access, config and invitations';
END
$$;

-- Force a failed audit insert; the corresponding entitlement mutation must
-- roll back. This prevents unlogged changes if the audit table fails.
CREATE OR REPLACE FUNCTION public.ci_reject_audit() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.action = 'revoke_access' THEN
    RAISE EXCEPTION 'forced CI audit write failure';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER ci_fail_audit BEFORE INSERT ON public.admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.ci_reject_audit();

DO $$
DECLARE
  denied boolean := false;
  state_after text;
BEGIN
  BEGIN
    PERFORM public.admin_change_entitlement(
      '11111111-1111-4111-8111-111111111111',
      '33333333-3333-4333-8333-333333333333','revoke_access',null,null,null,'Audit rollback test');
  EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Audit failed without raising'; END IF;
  SELECT state INTO state_after FROM public.entitlements
  WHERE user_id='33333333-3333-4333-8333-333333333333';
  IF state_after <> 'complimentary' THEN
    RAISE EXCEPTION 'Audit failure did not roll back entitlement: %',state_after;
  END IF;
  RAISE NOTICE 'PASS: failed audit rolls back access mutation';
END
$$;

-- Function grants: privileged RPCs must be callable by service_role only.
DO $$
DECLARE
  signature text;
  role_name text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.consume_ai_scan_budget(uuid)',
    'public.admin_change_entitlement(uuid,uuid,text,integer,text,text,text,text)',
    'public.admin_set_app_config(uuid,text,integer,numeric,integer,text)',
    'public.admin_create_beta_invite(uuid,text,timestamptz,integer,text)',
    'public.admin_revoke_beta_invite(uuid,uuid)'
  ] LOOP
    FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_function_privilege(role_name,signature,'EXECUTE') THEN
        RAISE EXCEPTION '% can execute %',role_name,signature;
      END IF;
    END LOOP;
    IF NOT has_function_privilege('service_role',signature,'EXECUTE') THEN
      RAISE EXCEPTION 'Service role cannot execute %',signature;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS: privileged function grants restricted';
END
$$;

-- Minimal, authenticated-only settings RPC: no direct public table access.
DO $$
BEGIN
  IF has_function_privilege('anon','public.get_public_app_settings()','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous role can read app settings RPC';
  END IF;
  IF NOT has_function_privilege('authenticated','public.get_public_app_settings()','EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated users cannot read limited settings RPC';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
             AND tablename='app_settings' AND policyname='app_settings read') THEN
    RAISE EXCEPTION 'Universal app_settings table SELECT policy still exists';
  END IF;
  RAISE NOTICE 'PASS: settings RPC permissions and policy';
END $$;

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
DO $$
DECLARE
  result jsonb;
  count_rows int;
  key_count int;
BEGIN
  result := public.get_public_app_settings();
  SELECT count(*) INTO key_count FROM jsonb_object_keys(result);
  IF result->>'trial_days' <> '21' OR
     NOT (result ? 'reward_access_hours') OR
     NOT (result ? 'max_daily_rewarded_ads') OR
     key_count <> 3 THEN
    RAISE EXCEPTION 'Public settings RPC leaks fields or returned wrong data: %',result;
  END IF;
  SELECT count(*) INTO count_rows FROM public.app_settings;
  IF count_rows <> 0 THEN RAISE EXCEPTION 'Non-admin direct settings SELECT is possible'; END IF;
  RAISE NOTICE 'PASS: non-admin receives minimal RPC data but cannot read table';
END $$;
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
DO $$
DECLARE
  count_rows int;
BEGIN
  SELECT count(*) INTO count_rows FROM public.app_settings;
  IF count_rows <> 1 THEN RAISE EXCEPTION 'Owner cannot directly read settings'; END IF;
  RAISE NOTICE 'PASS: owner can directly read app settings';
END $$;
ROLLBACK;

-- 0015: Last-mile beta account lifecycle. Revoked access must not be bypassed
-- by an old positive access_until or by a stale JWT in a protected query.
DO $$
DECLARE
  tester uuid := '33333333-3333-4333-8333-333333333333';
  owner_id uuid := '11111111-1111-4111-8111-111111111111';
  other uuid := '22222222-2222-4222-8222-222222222222';
  r jsonb;
  first_id uuid;
  again_id uuid;
  rejected boolean;
  n integer;
BEGIN
  UPDATE public.entitlements
     SET state='revoked', access_until=now()+interval '30 days'
     WHERE user_id=tester;
  IF public.has_access(tester) THEN
    RAISE EXCEPTION 'Revoked tester retained premium access through access_until';
  END IF;

  r := public.beta_submit_reactivation(tester,'Please extend the test');
  first_id := (r->>'id')::uuid;
  IF first_id IS NULL THEN RAISE EXCEPTION 'Request was not created'; END IF;
  r := public.beta_submit_reactivation(tester,'Duplicate');
  again_id := (r->>'id')::uuid;
  IF first_id <> again_id THEN
    RAISE EXCEPTION 'Duplicate request created a second pending item';
  END IF;
  SELECT count(*) INTO n FROM public.beta_reactivation_requests
    WHERE user_id=tester AND status='pending';
  IF n <> 1 THEN RAISE EXCEPTION 'One-pending constraint failed'; END IF;

  rejected := false;
  BEGIN
    PERFORM public.beta_review_reactivation(other,first_id,true,7,'Not owner');
  EXCEPTION WHEN OTHERS THEN rejected := true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Nonowner approved request'; END IF;
  rejected := false;
  BEGIN
    PERFORM public.beta_review_reactivation(owner_id,first_id,true,7,' ');
  EXCEPTION WHEN OTHERS THEN rejected := true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Empty audit reason allowed'; END IF;

  r := public.beta_review_reactivation(owner_id,first_id,true,7,'Approved seven-day beta test');
  IF r->>'status' <> 'approved' OR NOT public.has_access(tester) THEN
    RAISE EXCEPTION 'Approved tester extension did not activate access';
  END IF;
  SELECT count(*) INTO n FROM public.admin_audit_logs
   WHERE action='approve_beta_reactivation' AND target_user_id=tester;
  IF n <> 1 THEN RAISE EXCEPTION 'Approval was not audited exactly once'; END IF;
  rejected := false;
  BEGIN
    PERFORM public.beta_review_reactivation(owner_id,first_id,true,7,'Duplicate approval');
  EXCEPTION WHEN OTHERS THEN rejected := true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Same request approved twice'; END IF;
  rejected := false;
  BEGIN
    PERFORM public.beta_submit_reactivation(other,'Not invited');
  EXCEPTION WHEN OTHERS THEN rejected := true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Non-tester appealed'; END IF;
  RAISE NOTICE 'PASS: revoked deny, one pending appeal, owner approval and audit';
END $$;


-- Public signups and private beta invitations may coexist without letting
-- direct Supabase auth.signUp() bypass server-side rate limiting.
\i drizzle/migrations/0016_public_registration_tickets.sql

DO $$
DECLARE
  allowed boolean;
  ticket text := repeat('a',64);
  digest text := encode(pg_catalog.sha256(convert_to(ticket,'UTF8')),'hex');
  invite_code text := 'MM-' || repeat('B',40);
  invite_digest text := encode(pg_catalog.sha256(
    convert_to(lower(invite_code),'UTF8')),'hex');
  fake_beta uuid := '66666666-6666-4666-8666-666666666666';
  fake_normal uuid := '77777777-7777-4777-8777-777777777777';
  denied boolean;
  metadata jsonb;
  count_rows integer;
BEGIN
  -- A plain direct GoTrue signup must NOT be enough.
  denied := false;
  BEGIN
    INSERT INTO auth.users(id,email,raw_user_meta_data)
    VALUES ('55555555-5555-4555-8555-555555555555','bypass@example.invalid',
      '{"name":"No ticket"}'::jsonb);
  EXCEPTION WHEN OTHERS THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Direct signup bypassed guarded trigger'; END IF;

  -- Each issued signup token is redeemed atomically and stripped from auth metadata.
  allowed := public.issue_public_signup_ticket(digest);
  IF allowed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Ticket issue failed'; END IF;
  INSERT INTO auth.users(id,email,raw_user_meta_data)
  VALUES (fake_normal,'normal@example.invalid',
    jsonb_build_object('name','Normal User','public_signup_ticket',ticket,
                       'beta_invite_id','99999999-9999-4999-8999-999999999999'));
  SELECT raw_user_meta_data INTO metadata FROM auth.users WHERE id=fake_normal;
  IF metadata ? 'public_signup_ticket' OR metadata ? 'beta_invite_id' THEN
    RAISE EXCEPTION 'Signup authorization metadata leaked into auth user';
  END IF;
  SELECT count(*) INTO count_rows FROM public.beta_invite_redemptions
   WHERE user_id=fake_normal;
  IF count_rows <> 0 THEN
    RAISE EXCEPTION 'Public user was incorrectly classified as invited tester';
  END IF;
  denied:=false;
  BEGIN
    INSERT INTO auth.users(id,email,raw_user_meta_data)
    VALUES ('88888888-8888-4888-8888-888888888888','reused@example.invalid',
      jsonb_build_object('name','Reused','public_signup_ticket',ticket));
  EXCEPTION WHEN OTHERS THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Reused public ticket was accepted'; END IF;

  INSERT INTO public.beta_invites(id,code_hash,expires_at,max_uses)
  VALUES ('aaaa1111-aaaa-4111-8111-aaaaaaaa1111',
    invite_digest,now()+interval '7 days',1);
  INSERT INTO auth.users(id,email,raw_user_meta_data)
  VALUES (fake_beta,'tester2@example.invalid',
    jsonb_build_object('name','Invited Tester','beta_invite_code',invite_code));
  SELECT raw_user_meta_data INTO metadata FROM auth.users WHERE id=fake_beta;
  IF metadata ? 'beta_invite_code' OR NOT metadata ? 'beta_invite_id' THEN
    RAISE EXCEPTION 'Beta invitation not securely consumed';
  END IF;
  SELECT count(*) INTO count_rows FROM public.beta_invite_redemptions WHERE user_id=fake_beta;
  IF count_rows<>1 THEN RAISE EXCEPTION 'Invited tester was not marked invited'; END IF;
  denied:=false;
  BEGIN
    INSERT INTO auth.users(id,email,raw_user_meta_data)
    VALUES ('99999999-9999-4999-8999-999999999999','reuseinvite@example.invalid',
      jsonb_build_object('name','Invitation reuse','beta_invite_code',invite_code));
  EXCEPTION WHEN OTHERS THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Single-use beta invitation reused'; END IF;

  RAISE NOTICE 'PASS: gated public signup, one-use tickets and private beta classification';
END $$;

DO $$
BEGIN
  IF has_function_privilege('authenticated','public.issue_public_signup_ticket(text)','EXECUTE')
     OR has_function_privilege('anon','public.issue_public_signup_ticket(text)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.issue_public_signup_ticket(text)','EXECUTE')
  THEN
    RAISE EXCEPTION 'Public ticket issuer has incorrect privileges';
  END IF;
  RAISE NOTICE 'PASS: ticket issuer is service-role only';
END $$;
