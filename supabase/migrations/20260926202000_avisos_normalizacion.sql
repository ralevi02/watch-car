-- Lo que devuelve la normalización con IA: campos dudosos, explicación de
-- alertas y precio mencionado en la descripción.
alter table public.avisos drop column confianza;
alter table public.avisos add column por_confirmar text[] not null default '{}';
alter table public.avisos add column alerta_detalle text;
alter table public.avisos add column precio_descripcion bigint;
