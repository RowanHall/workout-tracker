-- Core tables for the Arrow-inspired workout tracker.
-- Weights are stored in lbs (profiles.preferred_unit reserved for future kg support).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text,
  avatar_url text,
  current_level int not null default 1,
  total_exp bigint not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_workout_date date,
  preferred_unit text not null default 'lbs' check (preferred_unit in ('lbs', 'kg')),
  created_at timestamptz not null default now()
);

create table public.exercises (
  id bigint generated always as identity primary key,
  name text not null unique,
  muscle_group text not null check (
    muscle_group in (
      'chest', 'back', 'shoulders', 'biceps', 'triceps',
      'quads', 'hamstrings', 'glutes', 'calves', 'core', 'full_body'
    )
  ),
  is_custom boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Workout',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  total_volume numeric not null default 0,
  total_sets int not null default 0,
  exp_earned int not null default 0
);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id bigint not null references public.exercises (id),
  set_number int not null check (set_number > 0),
  weight numeric not null check (weight >= 0),
  reps int not null check (reps > 0),
  is_pr boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id bigint not null references public.exercises (id),
  record_type text not null check (record_type in ('one_rep_max', 'max_volume_set')),
  value numeric not null,
  workout_id uuid references public.workouts (id) on delete set null,
  achieved_at timestamptz not null default now(),
  unique (user_id, exercise_id, record_type)
);

create table public.social_follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create table public.feed_interactions (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('cheer', 'comment')),
  content text,
  created_at timestamptz not null default now(),
  check (
    (type = 'comment' and content is not null and char_length(content) between 1 and 500)
    or (type = 'cheer' and content is null)
  )
);

-- A user can cheer a workout only once (comments are unlimited).
create unique index feed_interactions_one_cheer_per_user
  on public.feed_interactions (workout_id, user_id)
  where type = 'cheer';

create table public.trophies (
  id bigint generated always as identity primary key,
  code text not null unique,
  name text not null,
  description text not null,
  icon text not null default '🏆'
);

create table public.user_trophies (
  user_id uuid not null references public.profiles (id) on delete cascade,
  trophy_id bigint not null references public.trophies (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, trophy_id)
);

create index workouts_user_started_idx on public.workouts (user_id, started_at desc);
create index workout_sets_workout_idx on public.workout_sets (workout_id);
create index workout_sets_exercise_idx on public.workout_sets (exercise_id);
create index personal_records_user_idx on public.personal_records (user_id);
create index social_follows_followed_idx on public.social_follows (followed_id);
create index feed_interactions_workout_idx on public.feed_interactions (workout_id);
