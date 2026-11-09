-- Pedidos de correr una fuente desde la app. Los toma el worker del homelab,
-- que no está expuesto a internet: la app solo escribe aquí.
create table public.corridas_pedidas (
  id uuid primary key default gen_random_uuid(),
  fuente text not null,
  estado text not null default 'pedida' check (estado in ('pedida', 'corriendo', 'ok', 'error')),
  error text,
  pedida_en timestamptz not null default now(),
  tomada_en timestamptz,
  terminada_en timestamptz
);
create index corridas_pedidas_estado on public.corridas_pedidas (estado, pedida_en);
alter table public.corridas_pedidas enable row level security;
create policy "dueño maneja corridas pedidas" on public.corridas_pedidas for all to authenticated
  using ((select privado.es_dueno())) with check ((select privado.es_dueno()));
