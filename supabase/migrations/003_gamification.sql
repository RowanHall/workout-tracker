-- Gamification engine: profile auto-creation, level curve, and the
-- finish_workout RPC that computes volume, detects PRs, awards EXP,
-- maintains streaks, and unlocks trophies in one transaction.

-- Auto-create a profile row when a user signs up. Username comes from
-- auth metadata; falls back to a generated handle on collision.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
begin
  v_username := coalesce(
    new.raw_user_meta_data ->> 'username',
    'user_' || substr(new.id::text, 1, 8)
  );
  begin
    insert into public.profiles (id, username, display_name)
    values (
      new.id,
      v_username,
      coalesce(new.raw_user_meta_data ->> 'display_name', v_username)
    );
  exception when unique_violation then
    insert into public.profiles (id, username, display_name)
    values (
      new.id,
      v_username || '_' || substr(new.id::text, 1, 4),
      coalesce(new.raw_user_meta_data ->> 'display_name', v_username)
    );
  end;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- EXP needed to advance from `lvl` to `lvl + 1`: floor(100 * lvl^1.5).
-- Level 1->2 costs 100, 2->3 costs 282, 5->6 costs 1118, etc.
create or replace function public.exp_to_next_level(lvl int)
returns bigint
language sql
immutable
as $$
  select floor(100 * power(lvl, 1.5))::bigint;
$$;

create or replace function public.level_from_exp(p_exp bigint)
returns int
language plpgsql
immutable
as $$
declare
  lvl int := 1;
  needed bigint;
begin
  loop
    needed := public.exp_to_next_level(lvl);
    exit when p_exp < needed or lvl >= 999;
    p_exp := p_exp - needed;
    lvl := lvl + 1;
  end loop;
  return lvl;
end;
$$;

-- Finish an active workout. Runs as the caller (RLS still applies).
-- Returns a JSON summary the client uses for the celebration screen.
create or replace function public.finish_workout(p_workout_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_workout public.workouts%rowtype;
  v_profile public.profiles%rowtype;
  v_volume numeric;
  v_set_count int;
  v_today date := (now() at time zone 'utc')::date;
  v_streak int;
  v_exp int;
  v_pr_count int := 0;
  v_prs jsonb := '[]'::jsonb;
  v_new_trophies jsonb := '[]'::jsonb;
  v_old_level int;
  v_new_level int;
  v_total_exp bigint;
  v_lifetime_volume numeric;
  r record;
  t record;
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

  select coalesce(sum(total_volume), 0)
    into v_lifetime_volume
    from public.workouts
   where user_id = v_user and ended_at is not null;

  for t in select * from public.trophies loop
    if (t.code = 'first_workout')
       or (t.code = 'streak_3' and v_streak >= 3)
       or (t.code = 'streak_7' and v_streak >= 7)
       or (t.code = 'streak_30' and v_streak >= 30)
       or (t.code = 'volume_10k' and v_lifetime_volume >= 10000)
       or (t.code = 'volume_100k' and v_lifetime_volume >= 100000)
       or (t.code = 'volume_1m' and v_lifetime_volume >= 1000000)
       or (t.code = 'first_pr' and v_pr_count > 0)
       or (t.code = 'level_5' and v_new_level >= 5)
       or (t.code = 'level_10' and v_new_level >= 10)
       or (t.code = 'level_25' and v_new_level >= 25)
    then
      insert into public.user_trophies (user_id, trophy_id)
      values (v_user, t.id)
      on conflict do nothing;
      if found then
        v_new_trophies := v_new_trophies
          || jsonb_build_object('code', t.code, 'name', t.name, 'icon', t.icon);
      end if;
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
    'new_trophies', v_new_trophies
  );
end;
$$;
