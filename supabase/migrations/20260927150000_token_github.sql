-- Token de GitHub (solo Actions en este repo) para correr pasadas y la
-- reconexión de Facebook desde la app. Lo pega el dueño en Fuentes y queda en Vault.
create or replace function public.guardar_secreto_app(p_nombre text, p_valor text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and (p_nombre not in ('mercadolibre', 'github') or not privado.es_dueno()) then
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

-- El servidor de la app lo lee con la sesión del dueño para llamar a GitHub; nunca llega al navegador.
create or replace function public.leer_token_github()
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not privado.es_dueno() then
    raise exception 'Sin permiso';
  end if;
  return (select s.decrypted_secret from vault.decrypted_secrets s join public.secretos_app a on a.secreto_id = s.id where a.nombre = 'github');
end;
$$;

revoke execute on function public.leer_token_github() from public, anon;
grant execute on function public.leer_token_github() to authenticated, service_role;

-- Quitar el token desde la app (ej. si venció o se quiere cambiar).
create or replace function public.borrar_token_github()
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
  select secreto_id into v_id from public.secretos_app where nombre = 'github';
  if v_id is not null then
    delete from public.secretos_app where nombre = 'github';
    delete from vault.secrets where id = v_id;
  end if;
end;
$$;

revoke execute on function public.borrar_token_github() from public, anon;
grant execute on function public.borrar_token_github() to authenticated, service_role;
