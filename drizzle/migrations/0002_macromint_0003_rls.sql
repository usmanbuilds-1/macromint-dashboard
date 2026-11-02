-- ═══════════════════════════════════════════════════════════════════════
-- Macromint 0003 — Row Level Security
-- A hidden button is not security. Every protected operation below is
-- re-checked by the database on every request, regardless of what the UI
-- shows or what the client sends.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.app_settings       enable row level security;
alter table public.profiles           enable row level security;
alter table public.user_preferences   enable row level security;
alter table public.nutritional_goals  enable row level security;
alter table public.foods              enable row level security;
alter table public.favorites          enable row level security;
alter table public.saved_meals        enable row level security;
alter table public.diary_entries      enable row level security;
alter table public.recipes            enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.weight_entries     enable row level security;
alter table public.water_entries      enable row level security;
alter table public.entitlements       enable row level security;
alter table public.trial_records      enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.payments           enable row level security;
alter table public.admin_users        enable row level security;
alter table public.admin_audit_logs   enable row level security;
alter table public.rewarded_ad_events enable row level security;
alter table public.scan_corrections   enable row level security;
alter table public.notifications      enable row level security;
alter table public.user_consents      enable row level security;

-- ── app_settings: readable (trial terms must be disclosed), writable only
--    by the platform through the service role / admin edge function.
create policy "app_settings read" on public.app_settings
  for select to authenticated using (true);

-- ── Identity tables: strict ownership ───────────────────────────────────
create policy "profiles own read" on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy "profiles own write" on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles own insert" on public.profiles
  for insert to authenticated with check (user_id = auth.uid());

create policy "prefs own all" on public.user_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "goals own all" on public.nutritional_goals
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Foods: global items readable by all; custom items owned ─────────────
create policy "foods read" on public.foods
  for select to authenticated using (owner_id is null or owner_id = auth.uid());
create policy "foods custom insert" on public.foods
  for insert to authenticated
  with check (owner_id = auth.uid() and public.has_access(owner_id));
create policy "foods custom update" on public.foods
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "foods custom delete" on public.foods
  for delete to authenticated using (owner_id = auth.uid());

-- ── Premium tracking data: reads AND writes require active access ───────
create policy "favorites all" on public.favorites
  for all to authenticated
  using (user_id = auth.uid() and public.has_access(user_id))
  with check (user_id = auth.uid() and public.has_access(user_id));

create policy "saved_meals all" on public.saved_meals
  for all to authenticated
  using (user_id = auth.uid() and public.has_access(user_id))
  with check (user_id = auth.uid() and public.has_access(user_id));

create policy "diary read" on public.diary_entries
  for select to authenticated using (user_id = auth.uid() and public.has_access(user_id));
create policy "diary insert" on public.diary_entries
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_access(user_id));
create policy "diary update" on public.diary_entries
  for update to authenticated
  using (user_id = auth.uid() and public.has_access(user_id))
  with check (user_id = auth.uid() and public.has_access(user_id));
create policy "diary delete" on public.diary_entries
  for delete to authenticated using (user_id = auth.uid() and public.has_access(user_id));

create policy "recipes all" on public.recipes
  for all to authenticated
  using (user_id = auth.uid() and public.has_access(user_id))
  with check (user_id = auth.uid() and public.has_access(user_id));

create policy "recipe_ingredients all" on public.recipe_ingredients
  for all to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid() and public.has_access(auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid() and public.has_access(auth.uid())
    )
  );

create policy "weight all" on public.weight_entries
  for all to authenticated
  using (user_id = auth.uid() and public.has_access(user_id))
  with check (user_id = auth.uid() and public.has_access(user_id));

create policy "water all" on public.water_entries
  for all to authenticated
  using (user_id = auth.uid() and public.has_access(user_id))
  with check (user_id = auth.uid() and public.has_access(user_id));

create policy "scan_corrections read" on public.scan_corrections
  for select to authenticated using (user_id = auth.uid());
create policy "scan_corrections insert" on public.scan_corrections
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_access(user_id));

create policy "rewarded_ads read" on public.rewarded_ad_events
  for select to authenticated using (user_id = auth.uid());

create policy "subscriptions read" on public.subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "payments read" on public.payments
  for select to authenticated using (user_id = auth.uid());

create policy "entitlements read own" on public.entitlements
  for select to authenticated using (user_id = auth.uid());

create policy "trial_records read own" on public.trial_records
  for select to authenticated using (user_id = auth.uid() or email = (select email from auth.users where id = auth.uid()));

create policy "consents own all" on public.user_consents
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notifications read" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications mark read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Administration ──────────────────────────────────────────────────────
create policy "admin_users read" on public.admin_users
  for select to authenticated using (public.is_admin());

create policy "audit read" on public.admin_audit_logs
  for select to authenticated using (public.is_admin());
create policy "audit insert" on public.admin_audit_logs
  for insert to authenticated with check (public.is_admin());
-- No update or delete policies exist: the audit trail is append-only.
revoke update, delete on public.admin_audit_logs from authenticated;

-- ── Least-privilege grants (service_role keeps full access) ─────────────
revoke all on public.admin_audit_logs from anon;
revoke all on public.admin_users from anon;
grant select on public.app_settings to authenticated;