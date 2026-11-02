-- ═══════════════════════════════════════════════════════════════════════
-- Macromint 0005 — scan telemetry
-- Every AI scan is recorded server-side. Powers per-user rate limiting
-- and cost monitoring. Photos are never persisted; only the metadata.
-- ═══════════════════════════════════════════════════════════════════════

create table public.scan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  item_count int not null default 0,
  grounded_count int not null default 0,
  overall_confidence text,
  latency_ms int,
  created_at timestamptz not null default now()
);
create index scan_events_user_idx on public.scan_events (user_id, created_at desc);

alter table public.scan_events enable row level security;

create policy "scan_events read own" on public.scan_events
  for select to authenticated using (user_id = auth.uid());
-- Inserts happen only inside the ai-scan Edge Function via the service role.