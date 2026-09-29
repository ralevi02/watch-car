-- Lotes de remates de siniestrados (Karcal, Zárate), para avisar cuando un auto a la venta salió de uno.
create table public.remates (
  id text primary key,
  fuente text not null,
  lote text,
  patente text,
  marca text,
  modelo text,
  anio integer,
  km integer,
  color text,
  condicion text,
  mandante text,
  fecha timestamptz,
  precio integer,
  fotos text[] not null default '{}',
  url text,
  crudo jsonb not null default '{}',
  visto_en timestamptz not null default now()
);
create index remates_patente on public.remates (patente);
create index remates_marca_anio on public.remates (marca, anio);
alter table public.remates enable row level security;
create policy "dueño lee remates" on public.remates for select to authenticated using ((select privado.es_dueno()));

-- Si el aviso coincide con un remate: { tipo: 'patente' | 'posible', fuente, lote, fecha, condicion, km, url, patente }.
alter table public.avisos add column if not exists remate jsonb;

insert into public.fuentes (id, nombre, activa) values ('remates', 'Remates', true) on conflict (id) do nothing;
