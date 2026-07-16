-- Weekly-focus data for the public profile.
--
-- Feeds the last-7-days muscle heatmap + radar octagon shown alongside the
-- consistency tracker. Gated by the same visibility rule as get_consistency so
-- the two sections appear (or hide) together: owner, follower, or a target who
-- keeps their consistency public. SECURITY DEFINER exposes only the per-set
-- muscle/volume rows needed to draw the charts, never workout details, and
-- returns nothing when either party has blocked the other.

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
      (select p.consistency_public from public.profiles p where p.id = target),
      false
    )
    or exists (
      select 1 from public.social_follows f
      where f.follower_id = v_viewer and f.followed_id = target
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
