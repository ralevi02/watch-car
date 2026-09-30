-- La reconexión con navegador remoto sirve también para iniciar sesión en el
-- sitio de MercadoLibre (su API cerró la búsqueda en 2025). Esa sesión no es de
-- una cuenta de Facebook: se guarda como secreto de la app ("mercadolibre_sesion").
alter table public.reconexiones add column fuente text not null default 'facebook' check (fuente in ('facebook', 'mercadolibre'));
alter table public.reconexiones alter column cuenta_id drop not null;
alter table public.reconexiones add constraint reconexiones_cuenta_de_facebook check (fuente <> 'facebook' or cuenta_id is not null);
