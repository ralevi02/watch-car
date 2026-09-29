-- Del aviso a la compra, correcciones que enseñan a la IA, compartir para opinar,
-- uso de la IA, ajustes y "casi calzan".

-- Seguimiento del contacto con el vendedor y la visita.
alter table public.marcas
  add column if not exists contacto text check (contacto in ('por_contactar', 'escribi', 'respondio', 'visita', 'comprado')),
  add column if not exists motivo_descarte text,
  -- Lo que contó el vendedor (sacado de las notas de voz): [{ fecha, texto, datos }].
  add column if not exists llamadas jsonb not null default '[]',
  -- Checklist de la visita: { items: { <id>: { estado: 'bien'|'ojo'|'mal', nota?, fotos?[] } } }.
  add column if not exists visita jsonb not null default '{}',
  add column if not exists visita_en timestamptz;

-- Todas las fotos del aviso (la principal sigue en foto_url).
alter table public.avisos add column if not exists fotos text[] not null default '{}';
-- Separado a mano de otro auto: la deduplicación no lo vuelve a juntar.
alter table public.avisos add column if not exists separado boolean not null default false;

-- El dueño corrige avisos (modelo, tipo, auto) y reevalúa desde la app.
create policy "dueño corrige avisos" on public.avisos for update to authenticated
  using ((select privado.es_dueno())) with check ((select privado.es_dueno()));
create policy "dueño crea autos" on public.autos for insert to authenticated with check ((select privado.es_dueno()));
create policy "dueño reevalúa resultados" on public.resultados for all to authenticated
  using ((select privado.es_dueno())) with check ((select privado.es_dueno()));

-- Quedó fuera por poco (precio, km o año apenas pasados): se muestra aparte.
alter table public.resultados add column if not exists casi boolean not null default false;

-- Correcciones del dueño: arreglan el aviso y sirven de ejemplo para la IA.
create table public.correcciones (
  id uuid primary key default gen_random_uuid(),
  aviso_id uuid references public.avisos on delete set null,
  campo text not null check (campo in ('modelo', 'tipo')),
  valor text not null,
  -- Copia del texto, para usarlo de ejemplo aunque el aviso se borre.
  titulo text not null,
  descripcion text,
  creada_en timestamptz not null default now()
);
alter table public.correcciones enable row level security;
create policy "dueño maneja correcciones" on public.correcciones for all to authenticated
  using ((select privado.es_dueno())) with check ((select privado.es_dueno()));

-- Uso de Gemini (la capa gratis tiene cuota diaria por modelo).
create table public.uso_ia (
  id bigint generated always as identity primary key,
  dia date not null default (now() at time zone 'America/Santiago')::date,
  modelo text not null,
  uso text not null,
  creado_en timestamptz not null default now()
);
create index uso_ia_dia on public.uso_ia (dia);
alter table public.uso_ia enable row level security;
create policy "dueño ve uso de ia" on public.uso_ia for select to authenticated using ((select privado.es_dueno()));
create policy "dueño registra uso de ia" on public.uso_ia for insert to authenticated with check ((select privado.es_dueno()));

-- Ajustes sueltos del dueño (casa, avisos, proxy).
create table public.ajustes (
  clave text primary key,
  valor jsonb not null,
  actualizado_en timestamptz not null default now()
);
alter table public.ajustes enable row level security;
create policy "dueño maneja ajustes" on public.ajustes for all to authenticated
  using ((select privado.es_dueno())) with check ((select privado.es_dueno()));
insert into public.ajustes (clave, valor) values
  ('avisos', '{"modo": "inmediato", "hora": 20}'),
  ('proxy', '{"limite_mb": 1024, "desde": "2026-09-28"}')
on conflict (clave) do nothing;

-- Compartir un auto para que otra persona opine, sin cuenta.
create table public.enlaces_publicos (
  token text primary key default encode(extensions.gen_random_bytes(12), 'hex'),
  auto_id uuid not null references public.autos on delete cascade,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create table public.opiniones (
  id uuid primary key default gen_random_uuid(),
  token text not null references public.enlaces_publicos on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  voto text not null check (voto in ('me_gusta', 'no_me_convence', 'dudas')),
  texto text check (char_length(texto) <= 1000),
  creada_en timestamptz not null default now()
);
create index opiniones_token on public.opiniones (token);
alter table public.enlaces_publicos enable row level security;
alter table public.opiniones enable row level security;
create policy "dueño maneja enlaces" on public.enlaces_publicos for all to authenticated
  using ((select privado.es_dueno())) with check ((select privado.es_dueno()));
create policy "dueño lee opiniones" on public.opiniones for select to authenticated using ((select privado.es_dueno()));

-- Lo que ve quien recibe el link: datos del auto, fotos, links y opiniones. Nada de notas ni contacto.
create or replace function public.auto_publico(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with e as (select auto_id from public.enlaces_publicos where token = p_token and activo)
  select jsonb_build_object(
    'avisos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'fuente', a.fuente_id, 'url', a.url, 'titulo', a.titulo, 'precio', a.precio, 'anio', a.anio, 'km', a.km,
        'modelo', a.modelo, 'version', a.version, 'motor', a.motor, 'caja', a.caja, 'traccion', a.traccion,
        'comuna', a.comuna, 'region', a.region, 'vendedor', a.tipo_vendedor, 'descripcion', a.descripcion,
        'foto', a.foto_url, 'fotos', a.fotos, 'estado', a.estado
      ) order by a.precio nulls last), '[]'::jsonb)
      from public.avisos a where a.auto_id = (select auto_id from e)
    ),
    'opiniones', (
      select coalesce(jsonb_agg(jsonb_build_object('nombre', o.nombre, 'voto', o.voto, 'texto', o.texto, 'creada_en', o.creada_en) order by o.creada_en), '[]'::jsonb)
      from public.opiniones o where o.token = p_token
    )
  )
  where exists (select 1 from e);
$$;

create or replace function public.opinar(p_token text, p_nombre text, p_voto text, p_texto text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.enlaces_publicos where token = p_token and activo) then return false; end if;
  -- Tope por link, para que un link filtrado no se llene de basura.
  if (select count(*) from public.opiniones where token = p_token) >= 50 then return false; end if;
  insert into public.opiniones (token, nombre, voto, texto) values (p_token, left(trim(p_nombre), 40), p_voto, nullif(left(trim(p_texto), 1000), ''));
  return true;
end;
$$;

revoke all on function public.auto_publico(text) from public;
revoke all on function public.opinar(text, text, text, text) from public;
grant execute on function public.auto_publico(text) to anon, authenticated;
grant execute on function public.opinar(text, text, text, text) to anon, authenticated;

-- Fotos de la visita, privadas.
insert into storage.buckets (id, name, public) values ('visitas', 'visitas', false) on conflict (id) do nothing;
create policy "dueño maneja fotos de visitas" on storage.objects for all to authenticated
  using (bucket_id = 'visitas' and (select privado.es_dueno())) with check (bucket_id = 'visitas' and (select privado.es_dueno()));
