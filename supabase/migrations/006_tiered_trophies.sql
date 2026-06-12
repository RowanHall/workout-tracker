-- Replace the flat emoji trophy system with tiered, progress-tracked
-- achievements (bronze/silver/gold/platinum), updated atomically by
-- finish_workout and backfilled from existing workout history.

drop table if exists public.user_trophies;
drop table if exists public.trophies;

create type public.trophy_tier as enum ('none', 'bronze', 'silver', 'gold', 'platinum');

create table public.trophy_definitions (
  id                  uuid primary key default gen_random_uuid(),
  key                 text not null unique,
  display_name        text not null,
  description_format  text not null,
  icon                text not null default 'trophy',
  metric              text not null check (metric in ('total_volume', 'muscle_volume', 'streak_weeks')),
  unit                text not null default 'lbs',
  muscle_group_focus  text,
  bronze_threshold    bigint not null,
  silver_threshold    bigint not null,
  gold_threshold      bigint not null,
  platinum_threshold  bigint not null,
  sort_order          int not null default 0,
  check (bronze_threshold < silver_threshold
     and silver_threshold < gold_threshold
     and gold_threshold < platinum_threshold),
  check ((metric = 'muscle_volume') = (muscle_group_focus is not null))
);

create table public.user_trophy_progress (
  user_id               uuid not null references public.profiles (id) on delete cascade,
  trophy_definition_id  uuid not null references public.trophy_definitions (id) on delete cascade,
  current_raw_count     bigint not null default 0,
  highest_tier_achieved public.trophy_tier not null default 'none',
  updated_at            timestamptz not null default now(),
  primary key (user_id, trophy_definition_id)
);

alter table public.trophy_definitions enable row level security;
alter table public.user_trophy_progress enable row level security;

create policy "trophy_definitions_select" on public.trophy_definitions
  for select to authenticated using (true);
-- Progress is readable by all signed-in users (shown on social profiles);
-- rows are only written for oneself (via finish_workout, security invoker).
create policy "user_trophy_progress_select" on public.user_trophy_progress
  for select to authenticated using (true);
create policy "user_trophy_progress_insert_own" on public.user_trophy_progress
  for insert to authenticated with check (user_id = auth.uid());
create policy "user_trophy_progress_update_own" on public.user_trophy_progress
  for update to authenticated using (user_id = auth.uid());

create or replace function public.tier_for_count(p_def public.trophy_definitions, p_count bigint)
returns public.trophy_tier
language sql
immutable
set search_path = ''
as $$
  select case
    when p_count >= p_def.platinum_threshold then 'platinum'::public.trophy_tier
    when p_count >= p_def.gold_threshold then 'gold'::public.trophy_tier
    when p_count >= p_def.silver_threshold then 'silver'::public.trophy_tier
    when p_count >= p_def.bronze_threshold then 'bronze'::public.trophy_tier
    else 'none'::public.trophy_tier
  end;
$$;

insert into public.trophy_definitions
  (key, display_name, description_format, icon, metric, unit, muscle_group_focus,
   bronze_threshold, silver_threshold, gold_threshold, platinum_threshold, sort_order)
values
  ('TOTAL_VOLUME_LIFTED', 'The Iron Mountain', 'Lift {count} lbs total', 'mountain',
   'total_volume', 'lbs', null, 10000, 100000, 1000000, 10000000, 1),
  ('WORKOUT_STREAK', 'Unbreakable', 'Maintain a workout streak of {count} weeks', 'flame',
   'streak_weeks', 'weeks', null, 1, 4, 12, 52, 2),
  ('CHEST_VOLUME', 'Chest Day Warrior', 'Lift {count} lbs total focusing on chest exercises', 'shield',
   'muscle_volume', 'lbs', 'chest', 5000, 25000, 100000, 500000, 3);

-- Rebuild finish_workout: trophy logic now upserts tiered progress and
-- reports newly reached tiers as new_tiers in the summary JSON.
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

  -- Tiered trophy progress. Volume metrics accumulate; streak ratchets to
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
$$;

-- Backfill progress from existing workout history so current users do not
-- start from zero.
insert into public.user_trophy_progress (user_id, trophy_definition_id, current_raw_count)
select w.user_id, d.id, round(sum(w.total_volume))::bigint
  from public.workouts w
  cross join public.trophy_definitions d
 where d.metric = 'total_volume' and w.ended_at is not null
 group by w.user_id, d.id
having round(sum(w.total_volume)) > 0;

insert into public.user_trophy_progress (user_id, trophy_definition_id, current_raw_count)
select w.user_id, d.id, round(sum(s.weight * s.reps))::bigint
  from public.workouts w
  join public.workout_sets s on s.workout_id = w.id
  join public.exercises e on e.id = s.exercise_id
  join public.trophy_definitions d
    on d.metric = 'muscle_volume' and d.muscle_group_focus = e.muscle_group
 where w.ended_at is not null
 group by w.user_id, d.id
having round(sum(s.weight * s.reps)) > 0;

insert into public.user_trophy_progress (user_id, trophy_definition_id, current_raw_count)
select p.id, d.id, (p.longest_streak / 7)::bigint
  from public.profiles p
  cross join public.trophy_definitions d
 where d.metric = 'streak_weeks' and p.longest_streak >= 7;

update public.user_trophy_progress utp
   set highest_tier_achieved = public.tier_for_count(d, utp.current_raw_count)
  from public.trophy_definitions d
 where d.id = utp.trophy_definition_id;
