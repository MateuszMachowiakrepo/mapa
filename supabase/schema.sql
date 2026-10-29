-- Uruchom w Supabase: SQL Editor -> New query -> Run

create table places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  note text,
  lat double precision not null,
  lng double precision not null,
  category text,
  visited boolean not null default false,
  created_at timestamptz not null default now()
);

create table routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table route_stops (
  route_id uuid not null references routes on delete cascade,
  place_id uuid not null references places on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  position int not null,
  primary key (route_id, place_id)
);

alter table places enable row level security;
alter table routes enable row level security;
alter table route_stops enable row level security;

create policy "own places" on places for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own routes" on routes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own stops" on route_stops for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
