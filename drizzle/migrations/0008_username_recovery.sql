-- Macro Mint: recover username-only accounts without collecting an email.
-- DEPLOY ONLY AFTER backing up the database and validating in staging.
-- This migration is NOT automatically applied by a GitHub merge.
--
-- Public/anon/authenticated clients must never read recovery-code hashes.
-- Each 128-bit random recovery code is displayed once and stored only as a
-- SHA-256 digest. Redemption atomically marks one hash used (service role only).

create table if not exists public.username_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  constraint username_recovery_hash_shape check (code_hash ~ '^[0-9a-f]{64}$'),
  unique (user_id, code_hash)
);

create index if not exists username_recovery_user_available_idx
  on public.username_recovery_codes (user_id, used_at);

alter table public.username_recovery_codes enable row level security;
revoke all on public.username_recovery_codes from public, anon, authenticated;
grant select, insert, update, delete on public.username_recovery_codes to service_role;

create or replace function public.consume_username_recovery_code(
  p_user_id uuid,
  p_code_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  redeemed_id uuid;
begin
  update public.username_recovery_codes
    set used_at = now()
    where user_id = p_user_id
      and code_hash = p_code_hash
      and used_at is null
    returning id into redeemed_id;

  return redeemed_id is not null;
end;
$$;

revoke all on function public.consume_username_recovery_code(uuid,text) from public, anon, authenticated;
grant execute on function public.consume_username_recovery_code(uuid,text) to service_role;
