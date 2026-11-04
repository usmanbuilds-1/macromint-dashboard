-- Username-only auth: server-side, atomic protection against rapid guessing.
-- Additive migration. Apply manually in Lovable Cloud SQL editor after 0008.
-- The client never sees keys, counts, or caller identifiers.
-- A keyed HMAC of request scope and subject is computed only in Edge Functions.
-- This is defense in depth; separately verify gateway limits and trusted IP forwarding.
--
-- Rates are limited per time bucket. The service role is the only caller.
create table if not exists public.username_auth_attempts (
  scope text not null check (scope in ('register_ip', 'register_invite', 'recover_ip', 'recover_username')),
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  attempts integer not null check (attempts between 1 and 1000),
  primary key (scope, key_hash, window_start)
);

create index if not exists username_auth_attempts_window_idx
  on public.username_auth_attempts (window_start);

alter table public.username_auth_attempts enable row level security;
revoke all on public.username_auth_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.username_auth_attempts to service_role;

create or replace function public.consume_username_auth_budget(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql security definer set search_path = public, pg_catalog
as $$
declare
  recorded integer;
begin
  -- No dynamic SQL, unrestricted scopes, or arbitrary limits.
  if p_scope is null or p_scope not in ('register_ip', 'register_invite', 'recover_ip', 'recover_username')
     or p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$'
     or p_limit is null or p_limit < 1 or p_limit > 100
     or p_window_seconds is null or p_window_seconds not in (300, 900, 3600, 86400)
  then
    return false;
  end if;

  insert into public.username_auth_attempts as rate
    (scope, key_hash, window_start, attempts)
  values (
    p_scope,
    p_key_hash,
    to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds),
    1
  )
  on conflict (scope, key_hash, window_start) do update
    set attempts = rate.attempts + 1
    where rate.attempts < p_limit
  returning attempts into recorded;

  return recorded is not null;
end;
$$;

revoke all on function public.consume_username_auth_budget(text,text,integer,integer)
  from public, anon, authenticated;
grant execute on function public.consume_username_auth_budget(text,text,integer,integer)
  to service_role;

-- Maintenance: run this statement manually in Cloud SQL every few weeks:
-- DELETE FROM public.username_auth_attempts WHERE window_start < now() - interval '3 days';
