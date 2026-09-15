-- =============================================================
-- Valentía en Movimiento — migración 0004: Storage para el CMS/Admin
-- Ejecutar en el SQL Editor de Supabase después de 0001–0003. Aditiva:
-- crea un bucket nuevo y sus permisos, no toca nada existente.
--
-- Un solo bucket público ("medios") con tres carpetas por tipo de
-- archivo (portadas/, audios/, archivos/). "Público" es solo para LEER —
-- subir, reemplazar o borrar requiere ser admin/editor (es_staff()).
-- Es el mismo nivel de protección que ya tienen las URLs de video externas
-- (public_url visible para quien la tenga), así que no es un cambio de
-- postura de seguridad respecto al resto del contenido.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('medios', 'medios', true)
on conflict (id) do nothing;

create policy "medios_lectura_publica" on storage.objects for select
  using (bucket_id = 'medios');

create policy "medios_subida_staff" on storage.objects for insert
  with check (bucket_id = 'medios' and public.es_staff());

create policy "medios_actualizacion_staff" on storage.objects for update
  using (bucket_id = 'medios' and public.es_staff())
  with check (bucket_id = 'medios' and public.es_staff());

create policy "medios_borrado_staff" on storage.objects for delete
  using (bucket_id = 'medios' and public.es_staff());
