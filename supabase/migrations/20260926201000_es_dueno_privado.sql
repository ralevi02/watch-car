-- es_dueno() es SECURITY DEFINER: se mueve a un esquema que la API no expone,
-- para que no se pueda llamar como /rest/v1/rpc/es_dueno.
create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

alter function public.es_dueno() set schema privado;
