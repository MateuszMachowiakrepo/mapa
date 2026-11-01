-- Migracja ze starej wersji (places/routes/route_stops) do nowej.
-- UWAGA: usuwa stare trasy z listy punktów (route_stops) oraz kolumny note, category, visited.
-- Istniejące punkty dostają rodzaj 'place' (Miejsce); stare trasy zostają bez punktów.

drop table if exists route_stops;

alter table places drop column if exists note;
alter table places drop column if exists category;
alter table places drop column if exists visited;
alter table places add column kind text not null default 'place'
  check (kind in ('city', 'attraction', 'restaurant', 'place'));
alter table places add column fields jsonb not null default '{}';
alter table places add column inspiration text;

alter table routes add column theme text;
alter table routes add column inspiration text;
alter table routes add column points jsonb not null default '[]';
