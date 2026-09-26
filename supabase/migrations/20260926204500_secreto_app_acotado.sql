-- guardar_secreto_app se puede llamar con la sesión del dueño (para conectar
-- MercadoLibre desde la app), pero solo para ese secreto. El resto, solo el worker.
create or replace function public.guardar_secreto_app(p_nombre text, p_valor text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and (p_nombre <> 'mercadolibre' or not privado.es_dueno()) then
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
