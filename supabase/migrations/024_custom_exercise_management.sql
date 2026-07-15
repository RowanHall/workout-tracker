-- Owners can edit and delete their own custom exercises. Deleting an
-- exercise that is referenced by logged sets, PRs, or routines stays
-- blocked by the existing FK constraints (no cascade) — clients surface
-- that as "remove it from workouts/routines first".
create policy "exercises_update_own_custom" on public.exercises
  for update to authenticated
  using (is_custom = true and created_by = auth.uid())
  with check (is_custom = true and created_by = auth.uid());

create policy "exercises_delete_own_custom" on public.exercises
  for delete to authenticated
  using (is_custom = true and created_by = auth.uid());
