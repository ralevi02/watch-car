-- Al crear una ficha se pide una pasada solo para ella, sin repetir las demás.
alter table public.corridas_pedidas add column busqueda_id uuid references public.busquedas(id) on delete cascade;
