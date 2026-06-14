-- Body weight tracking: one entry per user per calendar day (re-logging the
-- same day overwrites the earlier value). Stored in lbs to match the rest of
-- the app. Body weight is private — only ever visible to its owner, never to
-- followers — so there is no follower select policy here.

create table public.body_weights (
  user_id uuid not null references public.profiles (id) on delete cascade,
  recorded_on date not null,
  weight numeric(6, 2) not null check (weight > 0 and weight < 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, recorded_on)
);

create index body_weights_user_date_idx
  on public.body_weights (user_id, recorded_on desc);

alter table public.body_weights enable row level security;

create policy "body_weights_select_own" on public.body_weights
  for select to authenticated using (user_id = auth.uid());

create policy "body_weights_insert_own" on public.body_weights
  for insert to authenticated with check (user_id = auth.uid());

create policy "body_weights_update_own" on public.body_weights
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "body_weights_delete_own" on public.body_weights
  for delete to authenticated using (user_id = auth.uid());
