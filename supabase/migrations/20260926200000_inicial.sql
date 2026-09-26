-- Esquema inicial de Radar seminuevos.
-- El worker escribe con la service key (se salta RLS). La app lee con la
-- sesión del usuario: solo los usuarios en "duenos" ven o cambian algo.

-- Dueños: se agregan a mano después del primer login (sin políticas: solo service role).
create table public.duenos (
  user_id uuid primary key references auth.users on delete cascade,
  creado_en timestamptz not null default now()
);
alter table public.duenos enable row level security;

create function public.es_dueno()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.duenos where user_id = (select auth.uid()));
$$;
revoke execute on function public.es_dueno() from public, anon;
grant execute on function public.es_dueno() to authenticated;

create function public.tocar_actualizada_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizada_en = now();
  return new;
end;
$$;

-- Portales de donde salen los avisos.
create table public.fuentes (
  id text primary key,
  nombre text not null,
  activa boolean not null default true,
  -- Frecuencia, horario y otros ajustes del recolector.
  config jsonb not null default '{}'
);
insert into public.fuentes (id, nombre, activa) values
  ('chileautos', 'Chileautos', true),
  ('facebook', 'Facebook Marketplace', false),
  ('mercadolibre', 'MercadoLibre', false),
  ('kavak', 'Kavak', false),
  ('yapo', 'Yapo', false);

-- Fichas de seguimiento (la ficha es un Seguimiento de @radar/core, validado con zod).
create table public.busquedas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  ficha jsonb not null,
  activa boolean not null default true,
  alertas boolean not null default true,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);
create trigger busquedas_actualizada_en before update on public.busquedas
  for each row execute function public.tocar_actualizada_en();

-- Cada corrida de un recolector.
create table public.pasadas (
  id uuid primary key default gen_random_uuid(),
  fuente_id text not null references public.fuentes,
  busqueda_id uuid references public.busquedas on delete set null,
  tipo text not null check (tipo in ('corta', 'completa', 'prueba')),
  estado text not null default 'corriendo' check (estado in ('corriendo', 'ok', 'bloqueo', 'error')),
  inicio timestamptz not null default now(),
  fin timestamptz,
  avisos_vistos integer,
  avisos_nuevos integer,
  paginas integer,
  kb integer,
  -- URL, errores, bloqueo, link a la corrida de GitHub.
  detalle jsonb not null default '{}'
);
create index pasadas_fuente_inicio on public.pasadas (fuente_id, inicio desc);
create index pasadas_busqueda on public.pasadas (busqueda_id);

-- Lo que devolvió el portal, tal cual, para reprocesar sin volver a scrapear.
create table public.avisos_crudos (
  id bigint generated always as identity primary key,
  pasada_id uuid references public.pasadas on delete set null,
  fuente_id text not null references public.fuentes,
  id_externo text not null,
  tipo text not null check (tipo in ('lista', 'detalle')),
  datos jsonb not null,
  hash text not null,
  creado_en timestamptz not null default now(),
  unique (fuente_id, id_externo, tipo, hash)
);
create index avisos_crudos_pasada on public.avisos_crudos (pasada_id);

-- Auto único después de deduplicar: puede tener avisos en varios portales.
create table public.autos (
  id uuid primary key default gen_random_uuid(),
  marca text,
  modelo text,
  version text,
  anio integer,
  km integer,
  region text,
  creado_en timestamptz not null default now()
);

-- Una publicación en un portal.
create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  fuente_id text not null references public.fuentes,
  id_externo text not null,
  url text not null,
  titulo text not null,
  auto_id uuid references public.autos on delete set null,
  -- Datos normalizados.
  marca text,
  modelo text,
  version text,
  anio integer,
  km integer,
  precio bigint,
  motor text,
  caja text check (caja in ('automatica', 'manual')),
  traccion text check (traccion in ('AWD', 'FWD')),
  combustible text,
  carroceria text,
  region text,
  comuna text,
  tipo_vendedor text check (tipo_vendedor in ('particular', 'automotora')),
  vendedor text,
  cross_country boolean,
  descripcion text,
  -- Daño, remate, pérdida total, precio distinto en la descripción, datos inconsistentes...
  alertas text[] not null default '{}',
  -- Confianza por campo ("Por confirmar" cuando es dudoso).
  confianza jsonb not null default '{}',
  normalizado_en timestamptz,
  -- Hash del crudo con que se normalizó: si cambia, se vuelve a normalizar.
  normalizado_hash text,
  -- Estado en el portal.
  estado text not null default 'activo' check (estado in ('activo', 'posible_vendido', 'vendido')),
  primera_vez timestamptz not null default now(),
  ultima_vez timestamptz not null default now(),
  veces_no_visto integer not null default 0,
  precio_inicial bigint,
  unique (fuente_id, id_externo)
);
create index avisos_auto on public.avisos (auto_id);
create index avisos_estado on public.avisos (estado, ultima_vez desc);

-- Historial de precios por aviso (una fila cada vez que cambia).
create table public.precios (
  id bigint generated always as identity primary key,
  aviso_id uuid not null references public.avisos on delete cascade,
  precio bigint not null,
  visto_en timestamptz not null default now()
);
create index precios_aviso on public.precios (aviso_id, visto_en desc);

-- Veredicto de cada aviso para cada ficha.
create table public.resultados (
  busqueda_id uuid not null references public.busquedas on delete cascade,
  aviso_id uuid not null references public.avisos on delete cascade,
  veredicto text not null check (veredicto in ('calza', 'advertencia', 'fuera')),
  motivos text[] not null default '{}',
  evaluado_en timestamptz not null default now(),
  notificado_en timestamptz,
  primary key (busqueda_id, aviso_id)
);
create index resultados_aviso on public.resultados (aviso_id);

-- Lo que marca el usuario sobre un auto.
create table public.marcas (
  auto_id uuid primary key references public.autos on delete cascade,
  estado text check (estado in ('favorito', 'descartado')),
  nota text,
  actualizada_en timestamptz not null default now()
);
create trigger marcas_actualizada_en before update on public.marcas
  for each row execute function public.tocar_actualizada_en();

-- Suscripciones a notificaciones push (web-push).
create table public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creada_en timestamptz not null default now()
);
create index push_suscripciones_user on public.push_suscripciones (user_id);

-- RLS: todo cerrado salvo para los dueños. avisos_crudos queda solo para el worker.
alter table public.fuentes enable row level security;
alter table public.busquedas enable row level security;
alter table public.pasadas enable row level security;
alter table public.avisos_crudos enable row level security;
alter table public.autos enable row level security;
alter table public.avisos enable row level security;
alter table public.precios enable row level security;
alter table public.resultados enable row level security;
alter table public.marcas enable row level security;
alter table public.push_suscripciones enable row level security;

create policy "dueño lee fuentes" on public.fuentes for select to authenticated using ((select public.es_dueno()));
create policy "dueño cambia fuentes" on public.fuentes for update to authenticated using ((select public.es_dueno())) with check ((select public.es_dueno()));

create policy "dueño maneja búsquedas" on public.busquedas for all to authenticated using ((select public.es_dueno())) with check ((select public.es_dueno()));

create policy "dueño lee pasadas" on public.pasadas for select to authenticated using ((select public.es_dueno()));
create policy "dueño lee autos" on public.autos for select to authenticated using ((select public.es_dueno()));
create policy "dueño lee avisos" on public.avisos for select to authenticated using ((select public.es_dueno()));
create policy "dueño lee precios" on public.precios for select to authenticated using ((select public.es_dueno()));
create policy "dueño lee resultados" on public.resultados for select to authenticated using ((select public.es_dueno()));

create policy "dueño maneja marcas" on public.marcas for all to authenticated using ((select public.es_dueno())) with check ((select public.es_dueno()));

create policy "dueño maneja sus suscripciones" on public.push_suscripciones for all to authenticated
  using ((select public.es_dueno()) and user_id = (select auth.uid()))
  with check ((select public.es_dueno()) and user_id = (select auth.uid()));
