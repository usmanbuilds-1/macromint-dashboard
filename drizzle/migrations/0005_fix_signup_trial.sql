create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  configured_trial_days int;
begin
  select coalesce(settings.trial_days, 14) into configured_trial_days from public.app_settings settings where settings.id = 1;
  configured_trial_days := coalesce(configured_trial_days, 14);

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
  values (new.id, 'trial_active', now(), now() + make_interval(days => configured_trial_days))
  on conflict (user_id) do nothing;

  insert into public.trial_records (user_id, email, started_at, expires_at)
  values (new.id, coalesce(new.email, ''), now(), now() + make_interval(days => configured_trial_days));

  return new;
end $$;

