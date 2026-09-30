-- Lo que la IA vio en las fotos: { crossCountry, kmTablero, patente, danos[], revisado_en, ... }.
alter table public.avisos add column if not exists vision jsonb;
-- Resumen corto de la descripción (lo importante en 3 líneas).
alter table public.avisos add column if not exists resumen text;
-- Señales de posible estafa encontradas en el aviso.
alter table public.avisos add column if not exists senales text[] not null default '{}';
-- Seguir un auto puntual: avisa de cualquier cambio de precio o si deja de aparecer.
alter table public.marcas add column if not exists seguir boolean not null default false;
