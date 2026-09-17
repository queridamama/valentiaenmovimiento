-- =============================================================
-- Valentía en Movimiento — migración 0009: corrección de arquitectura
-- para migrar Ruta Premium (videos + meditaciones del WordPress
-- anterior) como EXPERIENCIAS, no como contenidos sueltos de Biblioteca.
--
-- La migración 0008 los había traído como `contenidos` (tipo clase/
-- meditacion) pensando en Biblioteca. Eso era un error conceptual: cada
-- uno es un paso de un recorrido con preguntas de integración que la
-- usuaria responde ahí mismo — exactamente lo que ya modela
-- `experiencias` + `preguntas_experiencia`, no algo que deba vivir en
-- Biblioteca. Esta migración solo AGREGA lo que le faltaba a
-- `experiencias` para poder representarlos ahí. No toca `contenidos` (las
-- 28 lecturas siguen siendo contenidos tipo 'lectura', eso sí estaba
-- bien) ni ninguna policy de RLS.
--
-- Qué agrega a `experiencias`:
--   1. `tipo` ('clase' | 'meditacion'), default 'clase' — todas las
--      experiencias que ya existen hoy son de video, así que el default
--      las deja exactamente como están.
--   2. `audio_url`: hasta ahora una experiencia solo podía tener video.
--      Una meditación necesita audio, no video.
--   3. `duracion`: mismo campo de texto libre que ya usa `contenidos`
--      ("25 min", etc.) — se reutiliza el mismo criterio, no un formato
--      nuevo.
--   4. `wp_post_id` (unique), `etapa_wp`, `modulo_wp`: mismo patrón de
--      metadata de origen que ya se agregó a `contenidos` en 0008 — clave
--      de idempotencia y referencia para reorganizar desde Admin. Un
--      `wp_post_id` puede repetirse entre `contenidos` y `experiencias`
--      (son dos tablas distintas) pero es único DENTRO de cada una.
--   5. `es_recorrido_entrada` — ver nota abajo, es la pieza que evita un
--      bug real si no se agrega.
--
-- Por qué `es_recorrido_entrada` es necesario (no es un capricho):
-- `obtenerRecorridoEntrada()` (lib/datos.ts) arma "Mi Sueño" (el
-- recorrido gratis de entrada) con TODA experiencia que tenga
-- `etapa_id IS NULL` — hoy eso funciona porque las únicas experiencias
-- con etapa_id null son, precisamente, las 4 del recorrido de entrada.
-- Esta migración va a insertar 19 experiencias más con etapa_id NULL
-- (a propósito: no se asigna ninguna etapa nueva todavía, eso lo decide
-- Melisa desde Admin) — sin este campo, en cuanto una de esas 19 se
-- publicara sin haber sido asignada a una etapa todavía, se colaría en
-- el recorrido gratis de entrada. `es_recorrido_entrada` desambigua los
-- dos casos: default `true` dejA las 4 experiencias de entrada actuales
-- exactamente como están; las 19 importadas se insertan con `false`.
-- `obtenerRecorridoEntrada()` se actualiza (fuera de esta migración, en
-- el código) para filtrar también por este campo.
-- =============================================================

alter table experiencias
  add column if not exists tipo text not null default 'clase',
  add column if not exists audio_url text,
  add column if not exists duracion text,
  add column if not exists wp_post_id integer unique,
  add column if not exists etapa_wp text,
  add column if not exists modulo_wp text,
  add column if not exists es_recorrido_entrada boolean not null default true;

alter table experiencias drop constraint if exists experiencias_tipo_check;
alter table experiencias add constraint experiencias_tipo_check check (tipo in ('clase', 'meditacion'));

comment on column experiencias.wp_post_id is 'ID del post original en WordPress (tabla del CSV de meditaciones) — clave de idempotencia para scripts/importar-wordpress.ts. Único dentro de experiencias (independiente de contenidos.wp_post_id).';
comment on column experiencias.etapa_wp is 'Categoría de origen en WordPress (ej. "Etapa 1") — solo informativo, para reorganizar desde Admin.';
comment on column experiencias.modulo_wp is 'Tag de origen en WordPress (ej. "E1-M1", "E1-V1") — solo informativo.';
comment on column experiencias.es_recorrido_entrada is 'true = pertenece al recorrido gratis de entrada (Mi Sueño, etapa_id NULL). Experiencias importadas de Ruta Premium con etapa_id NULL (pendientes de asignar) llevan false, para no colarse en el recorrido de entrada. Ver comentario de esta migración para el detalle.';
