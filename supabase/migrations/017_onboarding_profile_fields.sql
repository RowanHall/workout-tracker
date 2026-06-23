-- Capture data collected during the post-signup onboarding flow on the
-- profiles row. Everything is nullable so legacy accounts (created before
-- onboarding existed) keep working; the app uses
-- onboarding_completed_at to decide whether to route new users into the
-- onboarding stack on first launch.

alter table public.profiles
  add column if not exists gender text
    check (gender in ('male', 'female', 'other')),
  add column if not exists birthday date,
  add column if not exists height_cm numeric
    check (height_cm is null or (height_cm > 0 and height_cm < 300)),
  add column if not exists distance_unit text not null default 'mi'
    check (distance_unit in ('mi', 'km')),
  add column if not exists primary_goal text
    check (primary_goal in ('build_muscle', 'gain_strength', 'fat_loss')),
  add column if not exists experience_level text
    check (experience_level in ('beginner', 'intermediate', 'advanced')),
  add column if not exists referral_source text,
  add column if not exists onboarding_completed_at timestamptz;

-- Treat every existing profile as already onboarded so legacy users aren't
-- forced through the new flow. Future profiles created via the signup
-- trigger get NULL by default, which is what the client checks against.
update public.profiles
set onboarding_completed_at = coalesce(onboarding_completed_at, created_at, now())
where onboarding_completed_at is null;
