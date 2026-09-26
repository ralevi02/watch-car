-- Fase 2: cuentas secundarias de Facebook (sesión cifrada en Vault),
-- reconexiones con navegador remoto y avisos compartidos desde el celular.

create table public.cuentas_facebook (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  estado text not null default 'sin_sesion'
    check (estado in ('sin_sesion', 'activa', 'necesita_reconexion', 'bloqueada', 'pausada')),
  -- Secreto de Vault con la sesión (storageState de Playwright). Nunca la contraseña.
  secreto_id uuid,
  sesion_guardada_en timestamptz,
  ultima_ok timestamptz,
  ultimo_error text,
  pasadas_hoy integer not null default 0,
  pasadas_fecha date,
  orden integer not null default 0,
  creada_en timestamptz not null default now()
);

create table public.reconexiones (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.cuentas_facebook on delete cascade,
  estado text not null default 'pedida'
    check (estado in ('pedida', 'abriendo', 'lista', 'guardando', 'ok', 'error', 'vencida')),
  -- Link temporal al navegador remoto y clave de la vista (solo la ve el dueño).
  url text,
  clave text,
  run_url text,
  error text,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);
create index reconexiones_cuenta on public.reconexiones (cuenta_id, creada_en desc);
create trigger reconexiones_actualizada_en before update on public.reconexiones
  for each row execute function public.tocar_actualizada_en();

-- Links compartidos o pegados desde el celular, para que el worker los lea.
create table public.compartidos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  fuente_id text references public.fuentes,
  id_externo text,
  texto text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'procesado', 'error', 'no_soportado')),
  aviso_id uuid references public.avisos on delete set null,
  error text,
  creado_en timestamptz not null default now(),
  procesado_en timestamptz
);
create index compartidos_estado on public.compartidos (estado, creado_en);
create index compartidos_aviso on public.compartidos (aviso_id);

alter table public.cuentas_facebook enable row level security;
alter table public.reconexiones enable row level security;
alter table public.compartidos enable row level security;

create policy "dueño maneja cuentas" on public.cuentas_facebook for all to authenticated
  using ((select privado.es_dueno())) with check ((select privado.es_dueno()));
create policy "dueño maneja reconexiones" on public.reconexiones for all to authenticated
  using ((select privado.es_dueno())) with check ((select privado.es_dueno()));
create policy "dueño maneja compartidos" on public.compartidos for all to authenticated
  using ((select privado.es_dueno())) with check ((select privado.es_dueno()));

-- Sesión en Vault. Solo el worker (service_role) puede guardar o leer.
create function public.guardar_sesion_facebook(p_cuenta uuid, p_sesion text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select secreto_id into v_id from public.cuentas_facebook where id = p_cuenta;
  if not found then
    raise exception 'No existe la cuenta %', p_cuenta;
  end if;
  if v_id is null then
    v_id := vault.create_secret(p_sesion, 'facebook_' || p_cuenta::text, 'Sesión de Facebook (storageState)');
  else
    perform vault.update_secret(v_id, p_sesion);
  end if;
  update public.cuentas_facebook
    set secreto_id = v_id, sesion_guardada_en = now(), estado = 'activa', ultimo_error = null
    where id = p_cuenta;
end;
$$;

create function public.leer_sesion_facebook(p_cuenta uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.decrypted_secret
  from vault.decrypted_secrets s
  join public.cuentas_facebook c on c.secreto_id = s.id
  where c.id = p_cuenta;
$$;

revoke execute on function public.guardar_sesion_facebook(uuid, text) from public, anon, authenticated;
revoke execute on function public.leer_sesion_facebook(uuid) from public, anon, authenticated;
grant execute on function public.guardar_sesion_facebook(uuid, text) to service_role;
grant execute on function public.leer_sesion_facebook(uuid) to service_role;

-- Al borrar una cuenta se borra su sesión de Vault.
create function privado.borrar_sesion_facebook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.secreto_id is not null then
    delete from vault.secrets where id = old.secreto_id;
  end if;
  return old;
end;
$$;
create trigger cuentas_facebook_borrar_sesion after delete on public.cuentas_facebook
  for each row execute function privado.borrar_sesion_facebook();

-- Ajustes de Facebook: rotación automática entre cuentas y ciudad de búsqueda.
update public.fuentes set config = '{"rotacion": true, "ciudad": "santiago", "pasadas_por_dia": 3}'::jsonb where id = 'facebook';
