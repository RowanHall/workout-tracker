-- Follow requests for private accounts.
--
-- Following a public account stays instant (status 'accepted'). Following a
-- private account now creates a 'pending' request that the account owner must
-- accept before it takes effect. Every visibility grant that keys off a follow
-- (workouts, PRs, consistency / weekly-focus aggregates) now requires an
-- *accepted* follow, so a pending request leaks nothing while it waits.

alter table public.social_follows
  add column if not exists status text not null default 'accepted'
    check (status in ('pending', 'accepted'));

-- Existing rows predate requests and are all real follows — the 'accepted'
-- default already covers them.

-- Insert: the requester may only create a row for themselves, and the status
-- must match the target's privacy — 'accepted' for a public account (instant
-- follow), 'pending' for a private one (a request). This is what stops a
-- client from side-stepping the wall by writing 'accepted' directly.
drop policy if exists "social_follows_insert_own" on public.social_follows;
create policy "social_follows_insert_own" on public.social_follows
  for insert to authenticated with check (
    follower_id = auth.uid()
    and (
      (
        status = 'accepted'
        and (select p.is_public from public.profiles p where p.id = followed_id)
      )
      or (
        status = 'pending'
        and not (select p.is_public from public.profiles p where p.id = followed_id)
      )
    )
  );

-- Update: only the account owner can act on a request, and only to accept it
-- (flip pending -> accepted). They can never forge a row for someone else.
create policy "social_follows_update_accept" on public.social_follows
  for update to authenticated
  using (followed_id = auth.uid())
  with check (followed_id = auth.uid() and status = 'accepted');

-- Delete: either side may remove the row — the follower unfollows or cancels a
-- pending request, and the account owner declines a request or drops a
-- follower.
drop policy if exists "social_follows_delete_own" on public.social_follows;
create policy "social_follows_delete_own" on public.social_follows
  for delete to authenticated using (
    follower_id = auth.uid() or followed_id = auth.uid()
  );

-- Visibility now requires an accepted follow, not merely a row.
drop policy if exists "workouts_select_own_or_followed" on public.workouts;
create policy "workouts_select_own_or_followed" on public.workouts
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.social_follows f
      where f.follower_id = auth.uid()
        and f.followed_id = workouts.user_id
        and f.status = 'accepted'
    )
  );

drop policy if exists "personal_records_select_own_or_followed" on public.personal_records;
create policy "personal_records_select_own_or_followed" on public.personal_records
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.social_follows f
      where f.follower_id = auth.uid()
        and f.followed_id = personal_records.user_id
        and f.status = 'accepted'
    )
  );

-- Now that a private account can grant access by accepting a request, its
-- accepted followers should see its consistency + weekly-focus aggregates.
-- Public accounts already expose these to any non-blocked viewer, so the added
-- clause only matters for private ones.
create or replace function public.get_consistency(target uuid)
returns table (day date, volume numeric, is_rest boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
  v_allowed boolean;
begin
  if v_viewer is null then
    return;
  end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_viewer and b.blocked_id = target)
       or (b.blocker_id = target and b.blocked_id = v_viewer)
  ) then
    return;
  end if;

  select
    target = v_viewer
    or coalesce(
      (select p.is_public from public.profiles p where p.id = target),
      false
    )
    or exists (
      select 1 from public.social_follows f
      where f.follower_id = v_viewer
        and f.followed_id = target
        and f.status = 'accepted'
    )
  into v_allowed;

  if not v_allowed then
    return;
  end if;

  return query
    select
      (w.ended_at at time zone 'utc')::date as day,
      sum(w.total_volume)::numeric as volume,
      false as is_rest
    from public.workouts w
    where w.user_id = target
      and w.ended_at is not null
      and w.ended_at >= now() - interval '372 days'
      and (w.visibility = 'public' or target = v_viewer)
    group by 1
    union all
    select
      r.rest_date as day,
      0::numeric as volume,
      true as is_rest
    from public.rest_days r
    where r.user_id = target
      and r.rest_date >= (now() at time zone 'utc')::date - 372;
end;
$$;

grant execute on function public.get_consistency(uuid) to authenticated;

create or replace function public.get_weekly_focus(target uuid)
returns table (muscle_group text, muscles jsonb, weight numeric, reps int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
  v_allowed boolean;
begin
  if v_viewer is null then
    return;
  end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_viewer and b.blocked_id = target)
       or (b.blocker_id = target and b.blocked_id = v_viewer)
  ) then
    return;
  end if;

  select
    target = v_viewer
    or coalesce(
      (select p.is_public from public.profiles p where p.id = target),
      false
    )
    or exists (
      select 1 from public.social_follows f
      where f.follower_id = v_viewer
        and f.followed_id = target
        and f.status = 'accepted'
    )
  into v_allowed;

  if not v_allowed then
    return;
  end if;

  return query
    select
      e.muscle_group::text as muscle_group,
      e.muscles as muscles,
      ws.weight as weight,
      ws.reps as reps
    from public.workout_sets ws
    join public.workouts w on w.id = ws.workout_id
    join public.exercises e on e.id = ws.exercise_id
    where w.user_id = target
      and w.ended_at is not null
      and w.ended_at >= now() - interval '7 days'
      and (w.visibility = 'public' or target = v_viewer);
end;
$$;

grant execute on function public.get_weekly_focus(uuid) to authenticated;
