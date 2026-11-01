-- Świeża instalacja. Uruchom w Supabase: SQL Editor -> New query -> Run
-- (Jeśli masz już starą wersję bazy, użyj supabase/migration.sql)

create table places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('city', 'attraction', 'restaurant', 'place')),
  name text not null,
  lat double precision not null,
  lng double precision not null,
  fields jsonb not null default '{}',
  inspiration text,
  created_at timestamptz not null default now()
);

create table routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  theme text,
  inspiration text,
  points jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table places enable row level security;
alter table routes enable row level security;

create policy "own places" on places for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own routes" on routes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
