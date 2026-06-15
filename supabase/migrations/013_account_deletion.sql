-- In-app account deletion (App Store Guideline 5.1.1(v); also satisfies the
-- Play Store Data deletion requirement).
--
-- A SECURITY DEFINER function lets a signed-in user erase themselves. Deleting
-- the auth.users row cascades through public.profiles and every table that
-- references it (workouts, workout_sets, personal_records, social_follows,
-- feed_interactions, user_trophies). Avatars live in Storage, which has no FK
-- cascade from auth.users, so we clear the user's avatar folder explicitly.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Avatars are namespaced as `<user_id>/...` in the public `avatars` bucket.
  delete from storage.objects
  where bucket_id = 'avatars'
    and (storage.foldername(name))[1] = uid::text;

  -- Removing the auth user cascades to the profile and all owned rows.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
