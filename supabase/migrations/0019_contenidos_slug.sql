-- Link humano opcional para compartir contenidos gratuitos fuera de la app.
-- La página pública /encuentros/[slug] solo muestra metadatos y exige que
-- el contenido esté publicado + ubicado explícitamente como Biblioteca Gratis.

alter table public.contenidos
  add column if not exists slug text;

create unique index if not exists contenidos_slug_unico
  on public.contenidos (slug)
  where slug is not null;

comment on column public.contenidos.slug is
  'Identificador público opcional para links compartibles, por ejemplo /encuentros/defini-tu-sueno.';
