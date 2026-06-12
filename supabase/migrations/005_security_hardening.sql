-- Address security advisor warnings: pin function search_path and prevent
-- clients from invoking the signup trigger function via the REST RPC API.

alter function public.exp_to_next_level(int) set search_path = '';
alter function public.level_from_exp(bigint) set search_path = '';

revoke execute on function public.handle_new_user() from public, anon, authenticated;
