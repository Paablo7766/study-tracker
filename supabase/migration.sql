-- Study Tracker: ejecutar en Supabase SQL Editor
-- Requiere: Authentication → Providers → Anonymous sign-ins → Enable

create table public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  subjects jsonb not null default '[]'::jsonb,
  sessions jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "Users read own data"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "Users insert own data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "Users update own data"
  on public.user_data for update
  using (auth.uid() = user_id);

create policy "Users delete own data"
  on public.user_data for delete
  using (auth.uid() = user_id);
