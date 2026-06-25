-- App Store Review Guideline 1.2 / UGC requirements:
--   * Users can report objectionable content.
--   * Users can block abusive accounts.
--   * Reports are reviewable by the operator within 24 hours.
--
-- Two new tables:
--   workout_reports — a reporter flags a workout. Operator triages from the
--     Supabase dashboard. No client-side mutation after insert.
--   user_blocks — a blocker hides the blocked account from their experience
--     in both directions: workouts, comments, follows.

create table if not exists public.workout_reports (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (
    reason in ('spam', 'harassment', 'nudity', 'violence', 'hate', 'other')
  ),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'pending' check (
    status in ('pending', 'reviewed', 'actioned', 'dismissed')
  ),
  created_at timestamptz not null default now(),
  unique (workout_id, reporter_id)
);

create index if not exists workout_reports_status_idx
  on public.workout_reports (status, created_at desc);

alter table public.workout_reports enable row level security;

-- Reporters insert and read their own reports; nobody else can see them.
create policy "workout_reports_insert_own" on public.workout_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

create policy "workout_reports_select_own" on public.workout_reports
  for select to authenticated
  using (reporter_id = auth.uid());

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx
  on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

-- A user manages their own block list. They never see blocks others have
-- placed on them; visibility filtering happens via the helper below.
create policy "user_blocks_select_own" on public.user_blocks
  for select to authenticated
  using (blocker_id = auth.uid());

create policy "user_blocks_insert_own" on public.user_blocks
  for insert to authenticated
  with check (blocker_id = auth.uid());

create policy "user_blocks_delete_own" on public.user_blocks
  for delete to authenticated
  using (blocker_id = auth.uid());

-- Helper: does either direction of a block exist between auth.uid() and the
-- given user? Used by all the social RLS policies so a block hides content
-- symmetrically.
create or replace function public.is_blocked_with(other_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = other_id)
       or (b.blocker_id = other_id and b.blocked_id = auth.uid())
  );
$$;

-- Severing follows the moment a block goes in keeps the followers list honest.
create or replace function public.user_blocks_drop_follows()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.social_follows
   where (follower_id = new.blocker_id and followed_id = new.blocked_id)
      or (follower_id = new.blocked_id and followed_id = new.blocker_id);
  return new;
end;
$$;

drop trigger if exists user_blocks_drop_follows on public.user_blocks;
create trigger user_blocks_drop_follows
  after insert on public.user_blocks
  for each row execute function public.user_blocks_drop_follows();

-- Re-create the workouts select policy so a block hides workouts in both
-- directions. A blocked user still can't see the blocker's public workouts,
-- and vice versa.
drop policy if exists "workouts_select_own_or_public" on public.workouts;
create policy "workouts_select_own_or_public" on public.workouts
  for select to authenticated using (
    user_id = auth.uid()
    or (visibility = 'public' and not public.is_blocked_with(workouts.user_id))
  );

-- Re-create the follows policies so blocked users can't re-follow each other.
drop policy if exists "social_follows_insert_own" on public.social_follows;
create policy "social_follows_insert_own" on public.social_follows
  for insert to authenticated
  with check (
    follower_id = auth.uid()
    and not public.is_blocked_with(followed_id)
  );

-- Comments + cheers from blocked users disappear from the requester's view,
-- and blocked users can't add new ones.
drop policy if exists "feed_interactions_select_visible" on public.feed_interactions;
create policy "feed_interactions_select_visible" on public.feed_interactions
  for select to authenticated using (
    exists (select 1 from public.workouts w where w.id = feed_interactions.workout_id)
    and not public.is_blocked_with(feed_interactions.user_id)
  );

drop policy if exists "feed_interactions_insert_own" on public.feed_interactions;
create policy "feed_interactions_insert_own" on public.feed_interactions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workouts w
      where w.id = feed_interactions.workout_id
        and not public.is_blocked_with(w.user_id)
    )
  );
