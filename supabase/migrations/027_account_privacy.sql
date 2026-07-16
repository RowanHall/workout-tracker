-- Account-level privacy.
--
-- Supersedes the earlier per-section `consistency_public` flag with a single
-- whole-account switch. When an account is private, only the owner can see
-- their streak, consistency tracker, weekly focus, records and workout
-- history — every other visitor sees just the display name and avatar.
-- Defaults to public so existing profiles stay visible.

alter table public.profiles
  add column if not exists is_public boolean not null default true;

-- Fold the retired consistency flag into the new account-wide one, then drop it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'consistency_public'
  ) then
    update public.profiles set is_public = consistency_public;
    alter table public.profiles drop column consistency_public;
  end if;
end $$;

-- Recreate the two profile-data RPCs to gate on the account-wide flag. A
-- private account is visible to nobody but its owner (following no longer
-- grants access, since follows are instant and would otherwise bypass the
-- wall); a public account still exposes these aggregates to any non-blocked
-- viewer without leaking the underlying workout rows.
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
