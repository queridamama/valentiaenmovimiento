-- =============================================================
-- Valentía en Movimiento — migración 0008: soporte para migrar contenido
-- del WordPress anterior (Ruta Premium + Lecturas y reflexiones).
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de 0001–0007. Es aditiva:
-- solo agrega columnas nuevas (nullable) y un valor nuevo al enum de
-- `tipo` — no borra, no renombra, no toca RLS.
--
-- Por qué no hace falta ninguna tabla nueva ni tocar RLS:
--   - La Ruta Premium ya se modela con `contenido_ubicaciones`
--     (contexto='etapa'): un `contenidos` puede colgar de una etapa sin
--     duplicarse, y por separado puede (o no) tener también una ubicación
--     en Biblioteca — exactamente el "pertenece_a_ruta / visible_en_
--     biblioteca como decisiones independientes" que pedía el brief de
--     importación. No se crea un segundo sistema paralelo.
--   - `contenido_accesible()` (ver supabase/schema.sql) ya trata un
--     `contenidos` SIN ninguna `contenido_ubicaciones` como no accesible
--     para nadie salvo staff (policy `contenidos_staff`). Como el import
--     entero entra en estado='borrador' y sin ubicaciones, queda
--     automáticamente invisible para cualquier usuaria hasta que se
--     publique y se le asigne un lugar desde /admin/biblioteca — sin
--     escribir una sola policy nueva.
--
-- Qué agrega:
--   1. `contenidos.wp_post_id` (int, unique): id original del post en
--      WordPress. Es la clave de idempotencia — importar dos veces hace
--      upsert por este campo, nunca duplica. Múltiples filas con NULL
--      conviven sin problema (así queda cualquier contenido creado a mano
--      desde siempre en Admin, que nunca tuvo un post de WordPress).
--   2. `contenidos.etapa_wp` / `modulo_wp` / `orden_wp`: metadata cruda de
--      origen (categoría "Etapa 1"/"Etapa 2" y tag "E1-M1"/"E1-V1"/etc. de
--      WordPress) — puramente informativa, para que Admin vea de dónde
--      vino cada contenido migrado y pueda reorganizarlo a la etapa nueva
--      que corresponda. Nunca se usa en ninguna policy ni en ninguna
--      query de la app real.
--   3. `contenidos.fecha_publicacion_original`: fecha real de publicación
--      en WordPress, para conservarla en Lecturas y reflexiones (y en
--      Ruta Premium, aunque ahí importa menos).
--   4. `tipo` suma 'lectura': la única categoría de Biblioteca que no
--      tenía todavía un tipo de contenido propio (Lecturas y reflexiones
--      — escritos/reflexiones de texto).
-- =============================================================

alter table contenidos
  add column if not exists wp_post_id integer unique,
  add column if not exists etapa_wp text,
  add column if not exists modulo_wp text,
  add column if not exists orden_wp int,
  add column if not exists fecha_publicacion_original timestamptz;

comment on column contenidos.wp_post_id is 'ID del post original en WordPress — clave de idempotencia para la migración (scripts/importar-wordpress.ts). NULL para todo lo creado directo en Admin.';
comment on column contenidos.etapa_wp is 'Categoría de origen en WordPress (ej. "Etapa 1") — solo informativo, para reorganizar desde Admin. No se usa en RLS ni en la app real.';
comment on column contenidos.modulo_wp is 'Tag de origen en WordPress (ej. "E1-M1", "E1-V1") — solo informativo, mismo criterio que etapa_wp.';

-- El check de `tipo` se creó sin nombre explícito en supabase/schema.sql,
-- así que Postgres le puso el nombre por convención
-- (<tabla>_<columna>_check). El `drop ... if exists` hace este bloque
-- seguro de re-correr aunque el nombre real difiriera.
alter table contenidos drop constraint if exists contenidos_tipo_check;
alter table contenidos add constraint contenidos_tipo_check check (
  tipo in ('clase', 'meditacion', 'audio', 'plantilla', 'recurso', 'taller_grabado', 'lectura')
);
