-- Rest days: let users mark a day as intentional recovery so it keeps the
-- streak alive without growing it. Capped at 5 per Monday-anchored week.

create table public.rest_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  rest_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, rest_date)
);

create index rest_days_user_date_idx on public.rest_days (user_id, rest_date desc);

alter table public.rest_days enable row level security;

create policy "rest_days_select_own_or_followed" on public.rest_days
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.social_follows f
      where f.follower_id = auth.uid() and f.followed_id = rest_days.user_id
    )
  );

create policy "rest_days_insert_own" on public.rest_days
  for insert to authenticated with check (user_id = auth.uid());

create policy "rest_days_delete_own" on public.rest_days
  for delete to authenticated using (user_id = auth.uid());

-- Mark today as a rest day. Preserves an existing live streak (refreshes
-- last_workout_date to today) but never grows it and never resurrects a
-- broken one. Capped at 5 rest days per Monday-anchored UTC week.
create or replace function public.log_rest_day()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_week_start date := v_today - ((extract(isodow from v_today)::int - 1));
  v_profile public.profiles%rowtype;
  v_week_rest_count int;
  v_worked_today boolean;
  v_streak_alive boolean;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select exists (
    select 1 from public.workouts
     where user_id = v_user
       and ended_at is not null
       and (ended_at at time zone 'utc')::date = v_today
  ) into v_worked_today;
  if v_worked_today then
    raise exception 'Already worked out today';
  end if;

  select count(*) into v_week_rest_count
    from public.rest_days
   where user_id = v_user
     and rest_date >= v_week_start
     and rest_date <= v_week_start + 6;
  if v_week_rest_count >= 5 then
    raise exception 'Rest day limit reached for this week';
  end if;

  insert into public.rest_days (user_id, rest_date)
  values (v_user, v_today)
  on conflict do nothing;
  if not found then
    raise exception 'Rest day already logged today';
  end if;

  select * into v_profile from public.profiles where id = v_user for update;

  -- Only refresh the streak's "last activity" stamp if the streak is still
  -- alive (last workout/rest was today or yesterday). A rest day cannot
  -- restart a broken streak.
  v_streak_alive := v_profile.last_workout_date is not null
    and v_profile.last_workout_date >= v_today - 1;
  if v_streak_alive then
    update public.profiles
       set last_workout_date = v_today
     where id = v_user;
  end if;

  return jsonb_build_object(
    'rest_date', v_today,
    'streak', case when v_streak_alive then v_profile.current_streak else 0 end,
    'week_rest_count', v_week_rest_count + 1
  );
end;
$$;
