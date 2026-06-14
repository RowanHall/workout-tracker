-- Make the signup trigger OAuth-aware. Social providers (Google, GitHub,
-- Apple) don't send a "username"/"display_name", but they do send name and
-- avatar fields under different keys. Derive a clean, constraint-valid
-- username and carry over the real display name + profile picture. Explicit
-- email/password usernames (already validated on the client) are preserved
-- exactly, case included.

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
  -- Preferred display name across providers.
  v_display := coalesce(
    m ->> 'display_name',
    m ->> 'full_name',
    m ->> 'name',
    m ->> 'user_name',
    m ->> 'preferred_username'
  );

  -- Avatar: Google uses "picture", GitHub/others use "avatar_url".
  v_avatar := coalesce(m ->> 'avatar_url', m ->> 'picture');

  if (m ->> 'username') ~ '^[a-zA-Z0-9_]{3,24}$' then
    -- Explicit, pre-validated username from the email/password sign-up form.
    v_username := m ->> 'username';
  else
    -- Derive from a social handle or the email local part, then sanitize to
    -- the allowed charset/length.
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
