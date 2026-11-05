-- Disposable PostgreSQL fixture for testing unapplied release migrations.
-- NEVER run against Lovable Cloud. This file creates minimal auth/users
-- fixtures and SECURITY DEFINER roles in an ephemeral CI service database.
CREATE SCHEMA auth;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text NOT NULL
);
CREATE TABLE public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  role text NOT NULL
);
CREATE TABLE public.admin_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  target_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  previous_state text,
  new_state text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  state text NOT NULL,
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz NOT NULL DEFAULT now(),
  access_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.app_settings (
  id integer PRIMARY KEY DEFAULT 1,
  trial_days integer NOT NULL DEFAULT 14,
  reward_access_hours numeric NOT NULL DEFAULT 24,
  max_daily_rewarded_ads integer NOT NULL DEFAULT 3,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.beta_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE CHECK (length(code_hash) = 64),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 100),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0 AND used_count <= max_uses),
  revoked_at timestamptz,
  note text CHECK (char_length(note) <= 200)
);

-- Match the real Cloud policy environment for the optional settings migration.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid());
$$;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON public.app_settings TO authenticated;
