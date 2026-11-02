-- ═══════════════════════════════════════════════════════════════════════
-- Macromint 0002 — server-authoritative logic
-- Access is decided HERE, in the database, never in the frontend.
-- ═══════════════════════════════════════════════════════════════════════

-- ── updated_at helper ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_prefs_updated before update on public.user_preferences
  for each row execute function public.set_updated_at();
create trigger trg_goals_updated before update on public.nutritional_goals
  for each row execute function public.set_updated_at();
create trigger trg_subs_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();
create trigger trg_entitlements_updated before update on public.entitlements
  for each row execute function public.set_updated_at();

-- ── Role check ──────────────────────────────────────────────────────────
-- SECURITY DEFINER so RLS on admin_users cannot be bypassed by reading the
-- table; the check itself is the only authority required.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- ── Entitlement check ───────────────────────────────────────────────────
-- Single source of truth for premium access. Evaluated on EVERY query by
-- RLS policies, so a revocation takes effect on the user's next request,
-- even inside an existing session.
create or replace function public.has_access(uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id = uid
      and (
        e.state in ('paid_active', 'complimentary')
        or (e.state = 'trial_active' and e.trial_ends_at >= now())
        or (e.access_until is not null and e.access_until > now())
      )
  );
$$;

-- ── New user provisioning ───────────────────────────────────────────────
-- Creates profile, preferences, placeholder goals, entitlement (trial from
-- configurable app_settings) and the trial ledger record in one transaction.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  trial_days int;
begin
  select coalesce(trial_days, 14) into trial_days from public.app_settings where id = 1;

  insert into public.profiles (user_id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (user_id) do nothing;

  insert into public.user_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.nutritional_goals
    (user_id, calorie_target, protein_g, carbs_g, fat_g, fiber_g, water_ml, method)
  values (new.id, 2000, 100, 220, 67, 28, 2500, 'placeholder')
  on conflict (user_id) do nothing;

  insert into public.entitlements (user_id, state, trial_started_at, trial_ends_at)
  values (new.id, 'trial_active', now(), now() + make_interval(days => trial_days))
  on conflict (user_id) do nothing;

  insert into public.trial_records (user_id, email, started_at, expires_at)
  values (new.id, coalesce(new.email, ''), now(), now() + make_interval(days => trial_days));

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Admin audit writer ──────────────────────────────────────────────────
-- Used by the admin-action Edge Function; appends an immutable record.
create or replace function public.log_admin_action(
  p_admin_id uuid,
  p_target uuid,
  p_action text,
  p_previous text,
  p_new text,
  p_reason text default null,
  p_metadata jsonb default '{}'
)
returns void
language sql volatile security definer set search_path = public as $$
  insert into public.admin_audit_logs
    (admin_id, target_user_id, action, previous_state, new_state, reason, metadata)
  values (p_admin_id, p_target, p_action, p_previous, p_new, p_reason, p_metadata);
$$;

revoke all on function public.log_admin_action from public;
grant execute on function public.log_admin_action to service_role;

-- ── Useful RPCs for the client ──────────────────────────────────────────
create or replace function public.my_entitlement()
returns setof public.entitlements
language sql stable security definer set search_path = public as $$
  select * from public.entitlements where user_id = auth.uid();
$$;

create or replace function public.check_access()
returns boolean
language sql stable as $$
  select public.has_access(auth.uid());
$$;

create or replace function public.am_i_admin()
returns boolean
language sql stable as $$
  select public.is_admin();
$$;

grant execute on function public.my_entitlement, public.check_access, public.am_i_admin to authenticated;