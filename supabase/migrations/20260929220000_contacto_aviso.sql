-- Cómo contactar al vendedor: { telefono?, email?, codigo?, parcial? } (lo que el portal o la descripción traen).
alter table public.avisos add column if not exists contacto jsonb;
