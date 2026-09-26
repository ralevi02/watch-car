-- Fase 3: Kavak y Yapo activos, MercadoLibre por API (tokens OAuth en Vault)
-- y foto principal de cada aviso para deduplicar por foto.

update public.fuentes set activa = true where id in ('kavak', 'yapo');

alter table public.avisos add column foto_url text;
-- dHash de 64 bits (hex) de la foto principal.
alter table public.avisos add column foto_hash text;
create index avisos_anio on public.avisos (anio) where foto_hash is not null;

-- Secretos de la app en Vault (hoy: tokens de MercadoLibre).
create table public.secretos_app (
  nombre text primary key,
  secreto_id uuid not null,
  actualizado_en timestamptz not null default now()
);
alter table public.secretos_app enable row level security;
create policy "dueño ve qué secretos hay" on public.secretos_app for select to authenticated using ((select privado.es_dueno()));

-- Guardar: el worker (service_role) o el dueño desde la app (al conectar MercadoLibre).
create function public.guardar_secreto_app(p_nombre text, p_valor text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not privado.es_dueno() then
    raise exception 'Sin permiso';
  end if;
  select secreto_id into v_id from public.secretos_app where nombre = p_nombre;
  if v_id is null then
    v_id := vault.create_secret(p_valor, 'app_' || p_nombre, 'Secreto de Radar seminuevos');
    insert into public.secretos_app (nombre, secreto_id) values (p_nombre, v_id);
  else
    perform vault.update_secret(v_id, p_valor);
    update public.secretos_app set actualizado_en = now() where nombre = p_nombre;
  end if;
end;
$$;

-- Leer: solo el worker.
create function public.leer_secreto_app(p_nombre text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.decrypted_secret from vault.decrypted_secrets s join public.secretos_app a on a.secreto_id = s.id where a.nombre = p_nombre;
$$;

revoke execute on function public.guardar_secreto_app(text, text) from public, anon;
grant execute on function public.guardar_secreto_app(text, text) to authenticated, service_role;
revoke execute on function public.leer_secreto_app(text) from public, anon, authenticated;
grant execute on function public.leer_secreto_app(text) to service_role;
