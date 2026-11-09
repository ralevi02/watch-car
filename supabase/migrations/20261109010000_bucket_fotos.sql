-- Copias de las fotos de Facebook (sus links vencen a las pocas semanas). Público: son las
-- mismas fotos de los avisos. Solo el worker (service_role) sube.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 2097152, array['image/webp'])
on conflict (id) do nothing;
