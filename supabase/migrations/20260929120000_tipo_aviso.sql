-- Qué vende el aviso según la normalización: un auto completo, un repuesto, un accesorio u otra cosa (ropa, servicios, arriendo).
alter table public.avisos add column if not exists tipo text check (tipo in ('auto', 'repuesto', 'accesorio', 'otro'));
