-- Saved workout routines.
--
-- A routine is a reusable template: title + ordered exercises + planned sets
-- (weight, reps). Starting a routine spawns a fresh workout and uses the
-- planned sets as placeholder hints — the user still logs each set live.

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  exercise_id bigint not null references public.exercises (id),
  position int not null default 0
);

create table public.routine_sets (
  id uuid primary key default gen_random_uuid(),
  routine_exercise_id uuid not null references public.routine_exercises (id) on delete cascade,
  set_number int not null check (set_number > 0),
  weight numeric not null check (weight >= 0),
  reps int not null check (reps > 0)
);

create index routines_user_idx on public.routines (user_id, created_at desc);
create index routine_exercises_routine_idx on public.routine_exercises (routine_id, position);
create index routine_sets_routine_exercise_idx on public.routine_sets (routine_exercise_id, set_number);

alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.routine_sets enable row level security;

create policy "routines_select_own" on public.routines
  for select to authenticated using (user_id = auth.uid());
create policy "routines_insert_own" on public.routines
  for insert to authenticated with check (user_id = auth.uid());
create policy "routines_update_own" on public.routines
  for update to authenticated using (user_id = auth.uid());
create policy "routines_delete_own" on public.routines
  for delete to authenticated using (user_id = auth.uid());

create policy "routine_exercises_select_own" on public.routine_exercises
  for select to authenticated using (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.user_id = auth.uid()
    )
  );
create policy "routine_exercises_insert_own" on public.routine_exercises
  for insert to authenticated with check (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.user_id = auth.uid()
    )
  );
create policy "routine_exercises_update_own" on public.routine_exercises
  for update to authenticated using (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.user_id = auth.uid()
    )
  );
create policy "routine_exercises_delete_own" on public.routine_exercises
  for delete to authenticated using (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.user_id = auth.uid()
    )
  );

create policy "routine_sets_select_own" on public.routine_sets
  for select to authenticated using (
    exists (
      select 1
      from public.routine_exercises re
      join public.routines r on r.id = re.routine_id
      where re.id = routine_sets.routine_exercise_id and r.user_id = auth.uid()
    )
  );
create policy "routine_sets_insert_own" on public.routine_sets
  for insert to authenticated with check (
    exists (
      select 1
      from public.routine_exercises re
      join public.routines r on r.id = re.routine_id
      where re.id = routine_sets.routine_exercise_id and r.user_id = auth.uid()
    )
  );
create policy "routine_sets_update_own" on public.routine_sets
  for update to authenticated using (
    exists (
      select 1
      from public.routine_exercises re
      join public.routines r on r.id = re.routine_id
      where re.id = routine_sets.routine_exercise_id and r.user_id = auth.uid()
    )
  );
create policy "routine_sets_delete_own" on public.routine_sets
  for delete to authenticated using (
    exists (
      select 1
      from public.routine_exercises re
      join public.routines r on r.id = re.routine_id
      where re.id = routine_sets.routine_exercise_id and r.user_id = auth.uid()
    )
  );
