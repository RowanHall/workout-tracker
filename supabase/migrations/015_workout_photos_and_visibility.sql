-- Workout visibility + attached photos.
--
-- visibility = 'public' keeps the current behaviour (owner + followers can see
-- it in the feed). visibility = 'private' makes the workout owner-only, even
-- for followers.
--
-- workout_photos holds zero or more images per workout, stored as paths in
-- the public `workout-photos` storage bucket.

alter table public.workouts
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'private'));

create table if not exists public.workout_photos (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  photo_url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists workout_photos_workout_id_idx
  on public.workout_photos (workout_id);

alter table public.workout_photos enable row level security;

-- A workout photo is visible whenever the parent workout is visible, which the
-- workouts RLS policy already enforces.
create policy "workout_photos_select_visible" on public.workout_photos
  for select to authenticated using (
    exists (select 1 from public.workouts w where w.id = workout_photos.workout_id)
  );

create policy "workout_photos_insert_own" on public.workout_photos
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workouts w
      where w.id = workout_photos.workout_id and w.user_id = auth.uid()
    )
  );

create policy "workout_photos_delete_own" on public.workout_photos
  for delete to authenticated using (user_id = auth.uid());

-- Re-create the workouts select policy so private workouts are hidden from
-- followers (they remain visible to the owner).
drop policy if exists "workouts_select_own_or_followed" on public.workouts;
create policy "workouts_select_own_or_followed" on public.workouts
  for select to authenticated using (
    user_id = auth.uid()
    or (
      visibility = 'public'
      and exists (
        select 1 from public.social_follows f
        where f.follower_id = auth.uid() and f.followed_id = workouts.user_id
      )
    )
  );

-- Public storage bucket for workout photos. Files are namespaced by user id
-- (`<user_id>/<workout_id>/<uuid>.jpg`) so callers may only write within
-- their own folder.
insert into storage.buckets (id, name, public)
values ('workout-photos', 'workout-photos', true)
on conflict (id) do nothing;

create policy "workout_photos_public_read" on storage.objects
  for select using (bucket_id = 'workout-photos');

create policy "workout_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'workout-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "workout_photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'workout-photos' and (storage.foldername(name))[1] = auth.uid()::text);
