alter table public.experiencias
  add column if not exists slug text;

create unique index if not exists experiencias_slug_unico
  on public.experiencias (slug)
  where slug is not null;

update public.experiencias
set slug = 'defini-tu-sueno'
where id = '6bc74743-21cd-42ff-9ac9-6808dbf3d176'::uuid
  and slug is null;

comment on column public.experiencias.slug is
  'Identificador opcional para link compartible público, ej. /experiencia/defini-tu-sueno.';
