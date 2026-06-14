-- Streaks were bucketed by the server's UTC date. A user training in the
-- evening in a timezone behind UTC has their workout's UTC date roll over to
-- the next day, so two consecutive *local* days could collapse onto a single
-- UTC day (miscounting the streak) or split oddly. The client now passes its
-- own local calendar date; all day math uses that, falling back to the UTC
-- date when it is not supplied (older app builds).
--
-- Adding a parameter changes the function signature, so each function is
-- dropped and recreated rather than replaced in place.

drop function if exists public.finish_workout(uuid);

create or replace function public.finish_workout(
  p_workout_id uuid,
  p_today date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_workout public.workouts%rowtype;
  v_profile public.profiles%rowtype;
  v_volume numeric;
  v_set_count int;
  v_today date := coalesce(p_today, (now() at time zone 'utc')::date);
  v_streak int;
  v_exp int;
  v_pr_count int := 0;
  v_prs jsonb := '[]'::jsonb;
  v_new_tiers jsonb := '[]'::jsonb;
  v_old_level int;
  v_new_level int;
  v_total_exp bigint;
  v_value bigint;
  v_raw bigint;
  v_prev_tier public.trophy_tier;
  v_new_tier public.trophy_tier;
  r record;
  d public.trophy_definitions%rowtype;
begin
  select * into v_workout
    from public.workouts
   where id = p_workout_id and user_id = v_user
   for update;
  if not found then
    raise exception 'Workout not found';
  end if;
  if v_workout.ended_at is not null then
    raise exception 'Workout already finished';
  end if;

  select coalesce(sum(weight * reps), 0), count(*)
    into v_volume, v_set_count
    from public.workout_sets
   where workout_id = p_workout_id;

  -- Discard empty workouts instead of awarding EXP for nothing.
  if v_set_count = 0 then
    delete from public.workouts where id = p_workout_id;
    return jsonb_build_object('discarded', true);
  end if;

  -- PR detection per exercise: best estimated 1RM (Epley formula) and best
  -- single-set volume, compared against the user's stored records.
  for r in
    select s.exercise_id,
           e.name,
           max(s.weight * (1 + s.reps / 30.0)) as best_e1rm,
           max(s.weight * s.reps) as best_set_volume
      from public.workout_sets s
      join public.exercises e on e.id = s.exercise_id
     where s.workout_id = p_workout_id and s.weight > 0
     group by s.exercise_id, e.name
  loop
    if not exists (
      select 1 from public.personal_records
       where user_id = v_user and exercise_id = r.exercise_id
         and record_type = 'one_rep_max' and value >= round(r.best_e1rm, 1)
    ) then
      insert into public.personal_records (user_id, exercise_id, record_type, value, workout_id)
      values (v_user, r.exercise_id, 'one_rep_max', round(r.best_e1rm, 1), p_workout_id)
      on conflict (user_id, exercise_id, record_type)
      do update set value = excluded.value,
                    workout_id = excluded.workout_id,
                    achieved_at = now();
      v_pr_count := v_pr_count + 1;
      v_prs := v_prs || jsonb_build_object(
        'exercise', r.name, 'type', 'one_rep_max', 'value', round(r.best_e1rm, 1));
    end if;

    if not exists (
      select 1 from public.personal_records
       where user_id = v_user and exercise_id = r.exercise_id
         and record_type = 'max_volume_set' and value >= r.best_set_volume
    ) then
      insert into public.personal_records (user_id, exercise_id, record_type, value, workout_id)
      values (v_user, r.exercise_id, 'max_volume_set', r.best_set_volume, p_workout_id)
      on conflict (user_id, exercise_id, record_type)
      do update set value = excluded.value,
                    workout_id = excluded.workout_id,
                    achieved_at = now();
      v_pr_count := v_pr_count + 1;
      v_prs := v_prs || jsonb_build_object(
        'exercise', r.name, 'type', 'max_volume_set', 'value', r.best_set_volume);
    end if;
  end loop;

  update public.workout_sets s
     set is_pr = true
   where s.workout_id = p_workout_id
     and exists (
       select 1 from public.personal_records pr
        where pr.user_id = v_user
          and pr.exercise_id = s.exercise_id
          and pr.workout_id = p_workout_id
     );

  select * into v_profile from public.profiles where id = v_user for update;

  if v_profile.last_workout_date = v_today then
    v_streak := greatest(v_profile.current_streak, 1);
  elsif v_profile.last_workout_date = v_today - 1 then
    v_streak := v_profile.current_streak + 1;
  else
    v_streak := 1;
  end if;

  -- EXP formula: 50 base + 5/set (capped at 20 sets) + 25/PR + streak bonus.
  v_exp := 50 + least(v_set_count, 20) * 5 + v_pr_count * 25 + least(v_streak, 7) * 10;

  v_old_level := v_profile.current_level;
  v_total_exp := v_profile.total_exp + v_exp;
  v_new_level := public.level_from_exp(v_total_exp);

  update public.workouts
     set ended_at = now(),
         total_volume = v_volume,
         total_sets = v_set_count,
         exp_earned = v_exp
   where id = p_workout_id;

  update public.profiles
     set total_exp = v_total_exp,
         current_level = v_new_level,
         current_streak = v_streak,
         longest_streak = greatest(longest_streak, v_streak),
         last_workout_date = v_today
   where id = v_user;

  -- Tiered trophy progress. Counting metrics accumulate; streak ratchets to
  -- its high-watermark (in whole weeks).
  for d in select * from public.trophy_definitions loop
    if d.metric = 'total_volume' then
      v_value := round(v_volume)::bigint;
    elsif d.metric = 'muscle_volume' then
      select coalesce(round(sum(s.weight * s.reps)), 0)::bigint
        into v_value
        from public.workout_sets s
        join public.exercises e on e.id = s.exercise_id
       where s.workout_id = p_workout_id
         and e.muscle_group = d.muscle_group_focus;
    elsif d.metric = 'streak_weeks' then
      v_value := (v_streak / 7)::bigint;
    elsif d.metric = 'workout_count' then
      v_value := 1;
    elsif d.metric = 'pr_count' then
      v_value := v_pr_count;
    else
      v_value := 0;
    end if;

    continue when v_value <= 0;

    insert into public.user_trophy_progress as utp
      (user_id, trophy_definition_id, current_raw_count)
    values (v_user, d.id, v_value)
    on conflict (user_id, trophy_definition_id) do update
      set current_raw_count = case
            when d.metric = 'streak_weeks'
              then greatest(utp.current_raw_count, excluded.current_raw_count)
            else utp.current_raw_count + excluded.current_raw_count
          end,
          updated_at = now()
    returning current_raw_count, highest_tier_achieved into v_raw, v_prev_tier;

    v_new_tier := public.tier_for_count(d, v_raw);
    if v_new_tier > v_prev_tier then
      update public.user_trophy_progress
         set highest_tier_achieved = v_new_tier
       where user_id = v_user and trophy_definition_id = d.id;
      v_new_tiers := v_new_tiers || jsonb_build_object(
        'key', d.key, 'name', d.display_name, 'icon', d.icon,
        'tier', v_new_tier::text);
    end if;
  end loop;

  return jsonb_build_object(
    'exp_earned', v_exp,
    'total_volume', v_volume,
    'total_sets', v_set_count,
    'streak', v_streak,
    'leveled_up', v_new_level > v_old_level,
    'new_level', v_new_level,
    'prs', v_prs,
    'new_tiers', v_new_tiers
  );
end;
$function$;

drop function if exists public.log_rest_day();

create or replace function public.log_rest_day(p_today date default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_today date := coalesce(p_today, (now() at time zone 'utc')::date);
  v_week_start date := v_today - ((extract(isodow from v_today)::int - 1));
  v_profile public.profiles%rowtype;
  v_week_rest_count int;
  v_streak_alive boolean;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_user for update;

  -- last_workout_date is stamped (in the user's local date) by both finishing
  -- a workout and logging a rest day, so it doubles as "already active today".
  if v_profile.last_workout_date = v_today then
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
$function$;
