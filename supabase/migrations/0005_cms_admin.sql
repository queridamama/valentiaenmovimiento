-- =============================================================
-- Valentía en Movimiento — migración 0005: columnas para el CMS/Admin
-- Ejecutar en el SQL Editor de Supabase después de 0001–0004. Aditiva:
-- solo agrega columnas nuevas (nullable), no borra ni renombra nada.
--
-- 1. `contenidos.contenido_html`: cuerpo de texto enriquecido de una
--    clase/meditación/recurso (la tabla ya tenía `descripcion`, pensada
--    como bajada corta, no como el cuerpo largo del contenido).
-- 2. `publicaciones_comunidad.titulo` / `imagen_url` / `audio_url`: el
--    editor de publicaciones de Meli necesita título opcional, imagen y
--    audio opcional, y esas columnas no existían — el resto de la
--    Comunidad (posts de alumnas) las deja en null y sigue exactamente
--    igual.
-- 3. `publicaciones_comunidad.estado`: para que una publicación de Meli
--    pueda guardarse como borrador antes de publicarse. Default
--    'publicado' — todas las publicaciones de alumnas que ya existen (y
--    las nuevas, que nunca mandan este campo) quedan exactamente como
--    estaban. La policy de lectura se ajusta para que un borrador de Meli
--    NUNCA sea visible para una alumna a nivel de base (no solo en la
--    consulta del feed): antes solo miraba la categoría, ahora también el
--    estado.
-- 4. `publicaciones_update_propio`: policy de UPDATE nueva sobre
--    `publicaciones_comunidad` — no existía ninguna (el esquema original
--    solo tenía select/insert/delete), así que sin esto Editar en
--    /admin/comunidad fallaría en silencio por RLS (0 filas afectadas,
--    sin error). Mismo criterio que ya usa el delete: dueña de la fila, o
--    staff.
-- =============================================================

alter table contenidos
  add column if not exists contenido_html text;

alter table publicaciones_comunidad
  add column if not exists titulo text,
  add column if not exists imagen_url text,
  add column if not exists audio_url text,
  add column if not exists estado text not null default 'publicado' check (estado in ('borrador', 'publicado'));

alter policy "publicaciones_select" on publicaciones_comunidad using (
  es_staff() or (
    estado = 'publicado'
    and exists (
      select 1 from categorias_comunidad c
      where c.id = categoria_id and (c.solo_premium = false or nivel_actual() = 'premium')
    )
  )
);

create policy "publicaciones_update_propio" on publicaciones_comunidad for update
  using (usuario_id = auth.uid() or es_staff())
  with check (usuario_id = auth.uid() or es_staff());
