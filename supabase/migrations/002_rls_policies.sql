-- Row Level Security: users own their data; followers can read each other's
-- workouts, sets, PRs, and interactions for the social feed.

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.personal_records enable row level security;
alter table public.social_follows enable row level security;
alter table public.feed_interactions enable row level security;
alter table public.trophies enable row level security;
alter table public.user_trophies enable row level security;

-- Profiles are public to signed-in users (needed for friend search and feed).
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- Exercise library is readable by everyone; users may add custom exercises.
create policy "exercises_select" on public.exercises
  for select to authenticated using (true);
create policy "exercises_insert_custom" on public.exercises
  for insert to authenticated
  with check (is_custom = true and created_by = auth.uid());

-- Workouts: visible to the owner and to their followers.
create policy "workouts_select_own_or_followed" on public.workouts
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.social_follows f
      where f.follower_id = auth.uid() and f.followed_id = workouts.user_id
    )
  );
create policy "workouts_insert_own" on public.workouts
  for insert to authenticated with check (user_id = auth.uid());
create policy "workouts_update_own" on public.workouts
  for update to authenticated using (user_id = auth.uid());
create policy "workouts_delete_own" on public.workouts
  for delete to authenticated using (user_id = auth.uid());

-- Sets inherit visibility from their parent workout (the subquery runs under
-- the workouts RLS policy for the requesting user).
create policy "workout_sets_select_visible" on public.workout_sets
  for select to authenticated using (
    exists (select 1 from public.workouts w where w.id = workout_sets.workout_id)
  );
create policy "workout_sets_insert_own" on public.workout_sets
  for insert to authenticated with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_sets.workout_id and w.user_id = auth.uid()
    )
  );
create policy "workout_sets_update_own" on public.workout_sets
  for update to authenticated using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_sets.workout_id and w.user_id = auth.uid()
    )
  );
create policy "workout_sets_delete_own" on public.workout_sets
  for delete to authenticated using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_sets.workout_id and w.user_id = auth.uid()
    )
  );

create policy "personal_records_select_own_or_followed" on public.personal_records
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.social_follows f
      where f.follower_id = auth.uid() and f.followed_id = personal_records.user_id
    )
  );
create policy "personal_records_insert_own" on public.personal_records
  for insert to authenticated with check (user_id = auth.uid());
create policy "personal_records_update_own" on public.personal_records
  for update to authenticated using (user_id = auth.uid());

-- Follow relationships are public (needed for follower counts).
create policy "social_follows_select" on public.social_follows
  for select to authenticated using (true);
create policy "social_follows_insert_own" on public.social_follows
  for insert to authenticated with check (follower_id = auth.uid());
create policy "social_follows_delete_own" on public.social_follows
  for delete to authenticated using (follower_id = auth.uid());

-- Cheers/comments are visible wherever the parent workout is visible.
create policy "feed_interactions_select_visible" on public.feed_interactions
  for select to authenticated using (
    exists (select 1 from public.workouts w where w.id = feed_interactions.workout_id)
  );
create policy "feed_interactions_insert_own" on public.feed_interactions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.workouts w where w.id = feed_interactions.workout_id)
  );
create policy "feed_interactions_delete_own" on public.feed_interactions
  for delete to authenticated using (user_id = auth.uid());

create policy "trophies_select" on public.trophies
  for select to authenticated using (true);
create policy "user_trophies_select" on public.user_trophies
  for select to authenticated using (true);
create policy "user_trophies_insert_own" on public.user_trophies
  for insert to authenticated with check (user_id = auth.uid());
