-- =============================================================
-- Valentía en Movimiento — migración 0017: meditación semanal.
--
-- Premium ahora promete explícitamente "una nueva meditación cada
-- semana" (antes evitábamos prometer frecuencia). Se reutiliza toda la
-- estructura de Biblioteca que ya existía (contenidos, tipo
-- 'meditacion', contenido_ubicaciones con contexto='biblioteca' +
-- nivel_acceso='membresia' para marcarla Premium) — solo hacen falta dos
-- columnas nuevas para identificar CUÁL contenido es "la meditación de
-- la semana" y desde cuándo corresponde mostrarla como la actual:
--
--   - es_meditacion_semanal: marca el contenido como parte de esta
--     serie (además de ser tipo 'meditacion' — permite tener otras
--     meditaciones sueltas en Biblioteca que no son "la de la semana").
--   - disponible_desde: fecha/hora desde la que esa meditación pasa a
--     ser "la actual". Nullable a propósito (no aplica a contenido que
--     no es meditación semanal).
--
-- A propósito NO se agrega a la policy de RLS de `contenidos` (a
-- diferencia de `novedades_inicio.publicado_desde`, que si filtra en la
-- policy): acá se necesita que la fila siga siendo visible ANTES de la
-- fecha para poder mostrar el teaser "Disponible el XX/XX" en Inicio
-- (una Premium tiene que poder ver el título/fecha de la próxima antes
-- de que se habilite) — algo que una policy que oculte la fila entera no
-- permitiría. La app decide, en el servidor, qué mostrar según
-- `disponible_desde` (ver obtenerMeditacionSemanal en lib/datos.ts):
-- nunca expone el audio (que además requiere URL firmada, ver
-- obtenerArchivosContenido) hasta que la fecha llegó. No es un límite de
-- seguridad Gratis/Premium (eso lo sigue resolviendo
-- contenido_ubicaciones.nivel_acceso + contenido_accesible(), sin
-- cambios) — es solo una regla de cuándo mostrarla como "la actual".
--
-- Nunca se usa para borrar u ocultar meditaciones semanales anteriores:
-- siguen existiendo, publicadas, disponibles en Biblioteca — dejan de
-- ser "la actual" únicamente cuando aparece una más nueva ya habilitada.
--
-- Aditiva y segura: no toca ninguna fila existente más que dejar estas
-- dos columnas en su default (false / null).
-- =============================================================

alter table contenidos
  add column if not exists es_meditacion_semanal boolean not null default false,
  add column if not exists disponible_desde timestamptz;

comment on column contenidos.es_meditacion_semanal is 'Marca este contenido (tipo "meditacion") como parte de la serie semanal de Premium. No reemplaza contenido_ubicaciones/nivel_acceso: sigue haciendo falta ubicarla en Biblioteca con nivel_acceso=membresia para que sea Premium.';
comment on column contenidos.disponible_desde is 'Fecha/hora desde la que esta meditación semanal pasa a ser "la actual" (ver obtenerMeditacionSemanal en lib/datos.ts). Null = no aplica (no es meditación semanal) o disponible desde siempre. No participa de ninguna policy de RLS a propósito — ver comentario de la migración.';
