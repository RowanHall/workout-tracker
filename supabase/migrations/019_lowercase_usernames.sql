-- Enforce lowercase-only usernames. Mixed-case handles broke profile lookups
-- (the Discover founder card searches by exact username), and case-sensitive
-- handles aren't worth the foot-guns. Lowercase every existing username,
-- tighten the check constraint, and update the signup trigger to coerce.

-- 1. Lowercase non-conflicting rows first.
update public.profiles p
set username = lower(p.username)
where p.username <> lower(p.username)
  and not exists (
    select 1 from public.profiles p2
    where p2.id <> p.id and p2.username = lower(p.username)
  );

-- 2. Any remaining rows would collide with an existing lowercase handle —
--    append a short id suffix so they stay unique.
update public.profiles p
set username = substr(lower(p.username), 1, 19) || '_' || substr(p.id::text, 1, 4)
where p.username <> lower(p.username);

-- 3. Tighten the check constraint.
alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles
  add constraint profiles_username_check
  check (username ~ '^[a-z0-9_]{3,24}$');

-- 4. Coerce incoming usernames to lowercase in the signup trigger.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_username text;
  v_base text;
  v_display text;
  v_avatar text;
begin
  v_display := coalesce(
    m ->> 'display_name',
    m ->> 'full_name',
    m ->> 'name',
    m ->> 'user_name',
    m ->> 'preferred_username'
  );

  v_avatar := coalesce(m ->> 'avatar_url', m ->> 'picture');

  if lower(m ->> 'username') ~ '^[a-z0-9_]{3,24}$' then
    v_username := lower(m ->> 'username');
  else
    v_base := coalesce(
      m ->> 'user_name',
      m ->> 'preferred_username',
      split_part(coalesce(new.email, ''), '@', 1)
    );
    v_base := lower(regexp_replace(coalesce(v_base, ''), '[^a-zA-Z0-9_]', '', 'g'));
    v_base := substr(v_base, 1, 24);
    if length(v_base) < 3 then
      v_base := 'user_' || substr(new.id::text, 1, 8);
    end if;
    v_username := v_base;
  end if;

  v_display := coalesce(v_display, v_username);

  begin
    insert into public.profiles (id, username, display_name, avatar_url)
    values (new.id, v_username, v_display, v_avatar);
  exception when unique_violation then
    insert into public.profiles (id, username, display_name, avatar_url)
    values (
      new.id,
      substr(v_username, 1, 19) || '_' || substr(new.id::text, 1, 4),
      v_display,
      v_avatar
    );
  end;

  return new;
end;
$$;
