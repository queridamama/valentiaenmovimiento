-- =============================================================
-- Valentía en Movimiento — migración 0018: PDF/material descargable en
-- experiencias (especialmente DEFINÍ). Ejecutar en el SQL Editor de
-- Supabase después de 0001–0017. Aditiva: agrega una sola columna
-- nullable, no toca ninguna tabla ni policy existente.
--
-- `experiencias.archivo_url`: mismo patrón que ya usa `contenidos.archivo_url`
-- (ver supabase/migrations/0008_migracion_wordpress.sql y
-- lib/acciones/almacenamiento.ts) — NO es una URL pública ni firmada,
-- es el PATH dentro del bucket privado "medios-privados" (carpeta
-- "archivos/", ver CONFIGURACION en lib/acciones/almacenamiento.ts,
-- subirArchivo con destino="archivo"). Se resuelve a una URL firmada de
-- corta duración recién al mostrarse (ver firmarUrlPrivada en
-- lib/almacenamiento.ts).
--
-- No hace falta ninguna policy nueva: `archivo_url` es una columna más
-- de la fila `experiencias`, así que ya queda cubierta por las policies
-- existentes de esa tabla (0002_experiencias.sql) —
-- "experiencias_staff" (acceso total para admin/editor) y
-- "experiencias_lectura" (select para miembros, solo
-- estado='publicado' y nivel_acceso acorde a nivel_actual()). Si esa
-- policy ya deja pasar la fila, el PDF que cuelga de ella queda
-- correctamente gratis u oculto detrás de Premium según corresponda —
-- sin ningún chequeo de acceso adicional en el código.
-- =============================================================

alter table experiencias
  add column if not exists archivo_url text;

comment on column experiencias.archivo_url is 'Path privado dentro del bucket "medios-privados" (carpeta "archivos/") con el PDF/material descargable de esta experiencia — nunca una URL pública. Se resuelve a una URL firmada recién al mostrarse (ver firmarUrlPrivada en lib/almacenamiento.ts). Mismo patrón que contenidos.archivo_url.';
