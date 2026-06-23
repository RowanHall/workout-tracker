-- Widen the workouts select policy so any authenticated user can see public
-- workouts, not just those of people they follow. This powers the Discover
-- tab on the feed, which surfaces public workouts from athletes the viewer
-- does not yet follow. Private workouts remain hidden from everyone except
-- the owner.

drop policy if exists "workouts_select_own_or_followed" on public.workouts;
create policy "workouts_select_own_or_public" on public.workouts
  for select to authenticated using (
    user_id = auth.uid()
    or visibility = 'public'
  );
