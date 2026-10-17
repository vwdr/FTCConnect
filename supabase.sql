create extension if not exists "pgcrypto";

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_number text not null,
  description text not null,
  address text not null,
  apply_link text not null,
  lat double precision not null,
  lng double precision not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teams
  add column if not exists team_number text;

create index if not exists teams_user_id_idx on public.teams(user_id);

alter table public.teams enable row level security;

drop policy if exists "Teams are viewable by everyone" on public.teams;
drop policy if exists "Users can insert their own teams" on public.teams;
drop policy if exists "Users can update their own teams" on public.teams;
drop policy if exists "Users can delete their own teams" on public.teams;

create policy "Teams are viewable by everyone"
  on public.teams for select
  using (true);

create policy "Users can insert their own teams"
  on public.teams for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own teams"
  on public.teams for update
  using (auth.uid() = user_id);

create policy "Users can delete their own teams"
  on public.teams for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

-- Seeded (unclaimed) team listings have no owner. RLS still blocks edits/deletes
-- on them because auth.uid() = null is never true.
alter table public.teams
  alter column user_id drop not null;

create unique index if not exists teams_seeded_team_number_idx
  on public.teams(team_number)
  where user_id is null;
