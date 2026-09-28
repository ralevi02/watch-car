-- Capturas privadas cuando un lector no encuentra avisos (solo las usa el worker con la clave de servicio).
insert into storage.buckets (id, name, public) values ('diagnostico', 'diagnostico', false) on conflict (id) do nothing;
