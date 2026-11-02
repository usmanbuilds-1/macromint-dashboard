-- ═══════════════════════════════════════════════════════════════════════
-- Macromint 0001 — schema
-- Every user-owned table carries an ownership relationship. Indexes are
-- tuned for the app's real queries (diary by date, food search, trends).
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pg_trgm;

-- ── Platform settings (singleton) ───────────────────────────────────────
create table public.app_settings (
  id int primary key default 1 check (id = 1),
  trial_days int not null default 14 check (trial_days between 0 and 90),
  reward_access_hours numeric not null default 24 check (reward_access_hours > 0),
  max_daily_rewarded_ads int not null default 3 check (max_daily_rewarded_ads between 0 and 20),
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (1);

-- ── Identity ────────────────────────────────────────────────────────────
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  sex text check (sex in ('male','female')),
  birth_year int check (birth_year is null or birth_year between 1900 and date_part('year', now())::int),
  height_cm numeric(5,1) check (height_cm is null or height_cm between 50 and 272),
  weight_kg numeric(5,1) check (weight_kg is null or weight_kg between 20 and 500),
  target_weight_kg numeric(5,1) check (target_weight_kg is null or target_weight_kg between 20 and 500),
  activity_level text check (activity_level in ('sedentary','light','moderate','active','very_active')),
  objective text check (objective in ('lose','maintain','gain','recomp')),
  units text not null default 'metric' check (units in ('metric','imperial')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  week_start int not null default 1 check (week_start between 0 and 1),
  reminders jsonb not null default '{}',
  ad_consent boolean not null default false,
  analytics_consent boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.nutritional_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  calorie_target int not null check (calorie_target between 800 and 10000),
  protein_g int not null check (protein_g between 10 and 500),
  carbs_g int not null check (carbs_g between 0 and 1200),
  fat_g int not null check (fat_g between 10 and 400),
  fiber_g int not null default 30 check (fiber_g between 0 and 150),
  water_ml int not null default 2500 check (water_ml between 500 and 8000),
  micro_targets jsonb not null default '{}',
  method text not null default 'mifflin_st_jeor',
  manually_adjusted boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ── Food database ───────────────────────────────────────────────────────
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  category text,
  source text not null default 'custom' check (source in ('seed','off','usda','custom')),
  source_id text,
  barcode text,
  verified boolean not null default false,
  per100g jsonb not null default '{}',
  serving_label text not null default '100 g',
  serving_grams numeric(7,1) not null default 100 check (serving_grams > 0),
  created_at timestamptz not null default now()
);
-- De-duplicate within a scope (global foods use the zero-uuid sentinel).
create unique index foods_identity_idx on public.foods
  (coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name), coalesce(brand, ''));
create index foods_owner_idx on public.foods (owner_id);
create index foods_search_idx on public.foods using gin (lower(name) gin_trgm_ops);
create index foods_barcode_idx on public.foods (barcode) where barcode is not null;

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, food_id)
);
create index favorites_user_idx on public.favorites (user_id, created_at desc);

create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  items jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index saved_meals_user_idx on public.saved_meals (user_id, created_at desc);

-- ── Diary ───────────────────────────────────────────────────────────────
create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snacks')),
  food_id uuid references public.foods(id) on delete set null,
  recipe_id uuid,
  name text not null,
  brand text,
  grams numeric(7,1) not null check (grams > 0),
  portion_percent int not null default 100 check (portion_percent between 1 and 100),
  base_nutrients jsonb not null default '{}',
  nutrients jsonb not null default '{}',
  source text not null default 'search' check (source in ('search','favorite','recipe','scan','custom')),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index diary_user_date_idx on public.diary_entries (user_id, entry_date desc);
create index diary_user_date_meal_idx on public.diary_entries (user_id, entry_date, meal_type);
create index diary_recent_idx on public.diary_entries (user_id, logged_at desc);

-- ── Recipes ─────────────────────────────────────────────────────────────
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  servings numeric(4,1) not null default 1 check (servings between 0.5 and 50),
  notes text,
  created_at timestamptz not null default now()
);
create index recipes_user_idx on public.recipes (user_id, created_at desc);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  name text not null,
  grams numeric(7,1) not null check (grams > 0),
  per100g jsonb not null default '{}',
  position int not null default 0
);
create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id, position);

-- ── Body measurements ───────────────────────────────────────────────────
create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  weight_kg numeric(5,1) not null check (weight_kg between 20 and 500),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);
create index weight_user_date_idx on public.weight_entries (user_id, entry_date desc);

create table public.water_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  amount_ml int not null check (amount_ml between 1 and 3000),
  created_at timestamptz not null default now()
);
create index water_user_date_idx on public.water_entries (user_id, entry_date desc);

-- ── Access, monetization, governance ────────────────────────────────────
create table public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state text not null
    check (state in ('trial_active','trial_expired','paid_active','complimentary','revoked','payment_overdue','suspended')),
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default now(),
  access_until timestamptz,
  updated_at timestamptz not null default now()
);

create table public.trial_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  outcome text check (outcome in ('converted','expired','revoked','comped'))
);
create index trial_records_email_idx on public.trial_records (lower(email));

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_ref text,
  plan text not null check (plan in ('monthly','annual')),
  status text not null check (status in ('active','canceled','past_due','incomplete','expired')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index subscriptions_provider_ref_idx on public.subscriptions (provider, provider_ref) where provider_ref is not null;
create index subscriptions_user_idx on public.subscriptions (user_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_ref text not null,
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  status text not null check (status in ('pending','succeeded','failed','refunded')),
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_ref)
);
create index payments_user_idx on public.payments (user_id, created_at desc);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','owner')),
  created_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_id uuid not null,
  target_user_id uuid not null,
  action text not null,
  previous_state text,
  new_state text,
  reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_target_idx on public.admin_audit_logs (target_user_id, created_at desc);
create index audit_admin_idx on public.admin_audit_logs (admin_id, created_at desc);

create table public.rewarded_ad_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  granted_hours numeric not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index rewarded_ads_user_idx on public.rewarded_ad_events (user_id, created_at desc);

create table public.scan_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id text,
  item_label text not null,
  original jsonb not null default '{}',
  corrected jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index scan_corrections_user_idx on public.scan_corrections (user_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('analytics','advertising','terms','privacy')),
  version text not null,
  granted_at timestamptz not null default now(),
  unique (user_id, kind)
);