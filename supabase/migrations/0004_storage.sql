-- =============================================================
-- Valentía en Movimiento — migración 0004: Storage para el CMS/Admin
-- Ejecutar en el SQL Editor de Supabase después de 0001–0003. Aditiva:
-- crea dos buckets nuevos y sus permisos, no toca nada existente.
--
-- DOS buckets, no uno — a propósito, por seguridad real:
--
--   "medios-publicos" (público): SOLO portadas/imágenes. Una imagen no es
--   contenido premium en sí misma (ya se ve, sin login, en cualquier
--   preview/miniatura), así que una URL pública estable es aceptable —
--   mismo nivel de exposición que ya tienen las URLs de video externas
--   (YouTube/Vimeo) que este proyecto usa desde el principio.
--
--   "medios-privados" (privado): audios, PDFs y cualquier archivo
--   descargable. Nadie puede leerlos por URL directa ni conociendo el
--   path — ni siquiera una usuaria autenticada. Se sirven ÚNICAMENTE vía
--   URL firmada de corta duración (createSignedUrl), emitida por una
--   Server Action que primero comprueba el acceso real en la base (ver
--   lib/acciones/almacenamiento.ts): si la fila de `contenidos` o
--   `publicaciones_comunidad` correspondiente no le es visible a esa
--   usuaria por RLS, no hay nada para firmar. Conocer el path del archivo
--   a mano (por ejemplo, porque alguien lo compartió) NO alcanza para
--   descargarlo: sin sesión, sin ser la usuaria correcta, o sin el nivel
--   de acceso que ese contenido pide, la URL firmada nunca se emite.
--
-- Todas las escrituras (insert/update/delete) en los dos buckets exigen
-- es_staff() — una alumna nunca puede subir, reemplazar ni borrar nada acá,
-- sin excepción.
-- =============================================================

insert into storage.buckets (id, name, public)
values
  ('medios-publicos', 'medios-publicos', true),
  ('medios-privados', 'medios-privados', false)
on conflict (id) do nothing;

-- ---------- medios-publicos: lectura de cualquiera, escritura de staff ----------
create policy "medios_publicos_lectura" on storage.objects for select
  using (bucket_id = 'medios-publicos');

create policy "medios_publicos_subida_staff" on storage.objects for insert
  with check (bucket_id = 'medios-publicos' and public.es_staff());

create policy "medios_publicos_actualizacion_staff" on storage.objects for update
  using (bucket_id = 'medios-publicos' and public.es_staff())
  with check (bucket_id = 'medios-publicos' and public.es_staff());

create policy "medios_publicos_borrado_staff" on storage.objects for delete
  using (bucket_id = 'medios-publicos' and public.es_staff());

-- ---------- medios-privados: SOLO staff lee directo (para poder
-- previsualizar lo que subió/gestiona); cualquier otra lectura pasa
-- exclusivamente por una URL firmada emitida con el cliente de servicio
-- (bypassea esta policy a propósito, pero solo después de validar el
-- acceso real contra la tabla correspondiente — ver
-- lib/acciones/almacenamiento.ts). Sin policy de select para "authenticated"
-- en general: es la pieza que hace que una alumna nunca pueda leer el
-- bucket privado por su cuenta, ni con el path exacto. ----------
create policy "medios_privados_lectura_staff" on storage.objects for select
  using (bucket_id = 'medios-privados' and public.es_staff());

create policy "medios_privados_subida_staff" on storage.objects for insert
  with check (bucket_id = 'medios-privados' and public.es_staff());

create policy "medios_privados_actualizacion_staff" on storage.objects for update
  using (bucket_id = 'medios-privados' and public.es_staff())
  with check (bucket_id = 'medios-privados' and public.es_staff());

create policy "medios_privados_borrado_staff" on storage.objects for delete
  using (bucket_id = 'medios-privados' and public.es_staff());
