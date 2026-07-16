-- Consistency tracker visibility.
--
-- A per-user toggle that exposes the training-consistency heatmap + week strip
-- on the public profile, even to people who don't follow them. Defaults to
-- public so the tracker shows up out of the box; a user can flip it private.
--
-- Individual workout rows stay governed by the existing workouts RLS policy —
-- this only reveals *aggregated* per-day volume, never workout details.

alter table public.profiles
  add column if not exists consistency_public boolean not null default true;

-- Aggregated per-day training volume + rest days for a profile, feeding the
-- heatmap and the 7-day strip. SECURITY DEFINER so a viewer can see a *public*
-- consistency tracker without following (and without gaining read access to the
-- underlying workout rows). Returns nothing when:
--   * the viewer is blocked (either direction), or
--   * the target keeps consistency private and the viewer neither follows them
--     nor is them.
-- Private workouts are only folded into the aggregate for the owner; other
-- viewers see public workouts only, matching the workouts RLS policy.
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
