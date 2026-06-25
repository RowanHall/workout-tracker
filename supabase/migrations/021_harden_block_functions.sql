-- Lock down the helpers introduced in 020 so they aren't exposed as RPCs.
--
-- is_blocked_with must remain SECURITY DEFINER (it reads block rows that the
-- requester's own RLS on user_blocks would otherwise hide), and the
-- `authenticated` role needs EXECUTE for the policies in 020 to evaluate.
-- We revoke from PUBLIC + anon so it can't be called via /rest/v1/rpc.
--
-- user_blocks_drop_follows is a trigger function — nothing should ever
-- invoke it directly. Triggers run as the table owner regardless of
-- EXECUTE grants, so we revoke from everyone.

revoke execute on function public.is_blocked_with(uuid) from public;
revoke execute on function public.is_blocked_with(uuid) from anon;
grant execute on function public.is_blocked_with(uuid) to authenticated;

revoke execute on function public.user_blocks_drop_follows() from public;
revoke execute on function public.user_blocks_drop_follows() from anon;
revoke execute on function public.user_blocks_drop_follows() from authenticated;
