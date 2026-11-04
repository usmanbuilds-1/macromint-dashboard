-- Macromint closed beta: reviewed additive migration, NOT automatically applied by pushing Git.
-- Existing registered users keep their identities and entitlements.
-- IMPORTANT: applying this migration immediately closes ALL NEW Supabase Auth registrations
-- without an invitation, including public Auth signup API calls.
-- Codes have the MM- prefix followed by 40 random hexadecimal digits.
-- Do not reuse a static invitation from a public deployment guide. Before activating
-- registration, prepare a private single-use owner invitation in Cloud SQL and verify
-- that the signup flow, Edge functions and rate limiter are deployed. The first
-- verified owner account must be promoted to admin only after registration.
--
-- Invitations are admission tickets only. Username-only testers set a username
-- and a strong password; GoTrue stores a synthetic email internally. Invitation
-- codes are not login credentials.
--
-- We use PostgreSQL's built-in SHA-256 (Postgres 14+) to avoid extensions and
-- preserve compatibility with Deno WebCrypto's SHA-256 implementation.

create table if not exists public.beta_invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (length(code_hash) = 64),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  max_uses int not null default 1 check (max_uses between 1 and 100),
  used_count int not null default 0 check (used_count >= 0 and used_count <= max_uses),
  revoked_at timestamptz,
  note text check (char_length(note) <= 200)
);

create table if not exists public.beta_invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.beta_invites(id),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique(invite_id, user_id)
);
create index if not exists beta_invite_redemptions_invite on public.beta_invite_redemptions(invite_id);

-- Never allow direct client reads/writes or leaks of invite hashes.
alter table public.beta_invites enable row level security;
alter table public.beta_invite_redemptions enable row level security;
revoke all on public.beta_invites, public.beta_invite_redemptions from anon, authenticated;
-- Trusted server-side service-role Edge Function performs invite administration.
grant select, insert, update, delete on public.beta_invites to service_role;
grant select, insert on public.beta_invite_redemptions to service_role;

-- BEFORE auth.users insert: use a single conditional UPDATE to atomically
-- redeem the invitation. A simultaneous second signup cannot reuse a one-use
-- invite. If user creation fails, the entire transaction rolls back.
create or replace function public.beta_require_invite()
returns trigger
language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  submitted_code text;
  invitation_id uuid;
  account_name text;
begin
  submitted_code := upper(btrim(coalesce(new.raw_user_meta_data ->> 'beta_invite_code', '')));
  account_name := btrim(coalesce(new.raw_user_meta_data ->> 'name', ''));

  if char_length(account_name) < 2 or char_length(account_name) > 100
     or submitted_code !~ '^MM-[A-F0-9]{40}
    raise exception 'A valid beta invitation and name are required'
      using errcode = 'P0001';
  end if;

  update public.beta_invites
     set used_count = used_count + 1
   where code_hash = encode(pg_catalog.sha256(convert_to(lower(submitted_code), 'UTF8')), 'hex')
     and expires_at > now()
     and revoked_at is null
     and used_count < max_uses
   returning id into invitation_id;

  if invitation_id is null then
    raise exception 'Invalid, expired or already redeemed invitation'
      using errcode = 'P0001';
  end if;

  -- Remove the shared one-time secret before the user row is ever stored.
  new.raw_user_meta_data :=
    (coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'beta_invite_code')
      || jsonb_build_object('beta_invite_id', invitation_id::text);
  return new;
end;
$$;

drop trigger if exists beta_check_before_signup on auth.users;
create trigger beta_check_before_signup
  before insert on auth.users for each row
  execute function public.beta_require_invite();

-- AFTER INSERT: link the identity to the invite for audit and admin controls.
-- Existing handle_new_user trigger continues to provision their ordinary
-- trial and existing profile/diary access policies.
create or replace function public.beta_record_signup()
returns trigger
language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  insert into public.beta_invite_redemptions(invite_id, user_id)
  values ((new.raw_user_meta_data ->> 'beta_invite_id')::uuid, new.id);
  return new;
end;
$$;

drop trigger if exists beta_record_after_signup on auth.users;
create trigger beta_record_after_signup
  after insert on auth.users for each row
  execute function public.beta_record_signup();

-- Trigger code runs with a definer, but no authenticated client can execute
-- the trigger functions directly.
revoke all on function public.beta_require_invite(), public.beta_record_signup() from public, anon, authenticated;
