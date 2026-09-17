-- =============================================================
-- Valentía en Movimiento — migración 0011: reorganización del contenido
-- existente dentro de la nueva estructura ETAPA → MÓDULOS → EXPERIENCIAS.
--
-- Ejecutar DESPUÉS de 0010_modulos_ruta.sql. Es idempotente (se puede
-- correr más de una vez sin duplicar módulos ni romper nada) y NO borra
-- ni crea experiencias nuevas — solo les asigna `modulo_id` (y, en dos
-- casos puntuales y explícitos, corrige `etapa_id`) a experiencias que ya
-- existen, emparejando por TÍTULO exacto (normalizado: minúsculas, sin
-- espacios de sobra, sin tildes — para no fallar por una tilde escrita
-- distinto entre este archivo y la base real).
--
-- IMPORTANTE — verificar antes de correr en producción: los títulos de
-- las 19 experiencias importadas de WordPress se tomaron del pedido de
-- reorganización, no de una lectura directa de la base real (este entorno
-- solo tiene credenciales de Supabase de prueba). Antes de ejecutar esto
-- contra producción, correr primero las consultas de verificación al
-- final de este archivo y confirmar que los 23 títulos matchean.
--
-- Qué NO toca: estado, nivel_acceso, preguntas, respuestas, completadas.
-- Las únicas dos correcciones de etapa_id explícitamente pedidas están
-- marcadas más abajo con "CORRECCIÓN". "Elegir desde mi identidad
-- futura" se asigna a su módulo pero se deja en 'borrador' a propósito
-- (no se toca su estado).
-- =============================================================

-- Normaliza para comparar títulos sin depender de que la tilde/mayúscula
-- esté escrita idéntico en este archivo y en la base real.
create or replace function public.normalizar_titulo(t text)
returns text
language sql
immutable
as $$
  select lower(trim(regexp_replace(
    translate(t, 'áéíóúÁÉÍÓÚñÑ¿¡', 'aeiouAEIOUnN  '),
    '\s+', ' ', 'g'
  )));
$$;

-- ---------- 1. Crear los 5 módulos (idempotente por etapa + título) ----------
insert into modulos_ruta (etapa_id, titulo, descripcion, orden, estado)
select et.id, v.titulo, v.descripcion, v.orden, 'publicado'
from etapas_ruta et
join (values
  ('DEFINÍ',     'De sueño a Proyecto de Valentía', null, 1),
  ('CONSTRUÍTE', 'Quién está manejando tu vida',    null, 1),
  ('CONSTRUÍTE', 'Hasta dónde te bancás crecer',    null, 2),
  ('CONSTRUÍTE', 'Automático vs Intención',         null, 3),
  ('CONSTRUÍTE', 'Diseño de tu nueva identidad',    null, 4)
) as v(etapa_nombre, titulo, descripcion, orden) on v.etapa_nombre = et.nombre
where not exists (
  select 1 from modulos_ruta m
  where m.etapa_id = et.id and normalizar_titulo(m.titulo) = normalizar_titulo(v.titulo)
);

-- ---------- 2. DEFINÍ: las 4 experiencias del recorrido gratis ----------
-- Se les asigna etapa_id + modulo_id (antes tenían etapa_id NULL). Esto
-- NO afecta al recorrido Gratis: `obtenerRecorridoEntrada()` ya no
-- depende de `etapa_id IS NULL`, depende de `es_recorrido_entrada = true`
-- (ver lib/datos.ts) — que estas 4 filas conservan sin tocar. Es
-- precisamente lo que permite que, al pasar a Premium, estas mismas
-- experiencias completadas aparezcan ya hechas dentro del módulo DEFINÍ.
do $$
declare
  v_etapa_id uuid;
  v_modulo_id uuid;
begin
  select id into v_etapa_id from etapas_ruta where nombre = 'DEFINÍ';
  select id into v_modulo_id from modulos_ruta where etapa_id = v_etapa_id and normalizar_titulo(titulo) = normalizar_titulo('De sueño a Proyecto de Valentía');

  update experiencias set etapa_id = v_etapa_id, modulo_id = v_modulo_id
  where modulo_id is distinct from v_modulo_id
    and normalizar_titulo(titulo) in (
      normalizar_titulo('Un sueño no es un capricho'),
      normalizar_titulo('La valentía se entrena'),
      normalizar_titulo('Noventa días es una promesa, no una carrera'),
      normalizar_titulo('Declará tu Proyecto de Valentía')
    );
end $$;

-- ---------- 3. CONSTRUÍTE: los 4 módulos con sus experiencias ----------
-- Cada bloque asigna modulo_id + orden (posición dentro del módulo, tal
-- como se lista en el pedido) a las experiencias existentes que
-- coincidan por título. `etapa_id` se fuerza a CONSTRUÍTE en todos los
-- casos: dos de estas experiencias hoy NO están en CONSTRUÍTE ("El borde
-- posible" no tiene etapa asignada; "La mujer que puede sostenerlo" está
-- en DISEÑÁ) — son las dos "CORRECCIÓN" explícitamente pedidas. Para el
-- resto, ya deberían estar en CONSTRUÍTE o sin etapa: este UPDATE las
-- deja a todas consistentes en la etapa correcta sin excepción.
do $$
declare
  v_etapa_id uuid;
  v_mod1 uuid; v_mod2 uuid; v_mod3 uuid; v_mod4 uuid;
begin
  select id into v_etapa_id from etapas_ruta where nombre = 'CONSTRUÍTE';
  select id into v_mod1 from modulos_ruta where etapa_id = v_etapa_id and normalizar_titulo(titulo) = normalizar_titulo('Quién está manejando tu vida');
  select id into v_mod2 from modulos_ruta where etapa_id = v_etapa_id and normalizar_titulo(titulo) = normalizar_titulo('Hasta dónde te bancás crecer');
  select id into v_mod3 from modulos_ruta where etapa_id = v_etapa_id and normalizar_titulo(titulo) = normalizar_titulo('Automático vs Intención');
  select id into v_mod4 from modulos_ruta where etapa_id = v_etapa_id and normalizar_titulo(titulo) = normalizar_titulo('Diseño de tu nueva identidad');

  -- Módulo 1
  update experiencias e set etapa_id = v_etapa_id, modulo_id = v_mod1, orden = v.orden
  from (values
    ('El punto de partida', 1),
    ('Quién está manejando tu vida', 2),
    ('Identificar tus versiones', 3),
    ('Tu versión futura te está esperando', 4),
    ('Elegir quién toma decisiones', 5)
  ) as v(titulo, orden)
  where normalizar_titulo(e.titulo) = normalizar_titulo(v.titulo);

  -- Módulo 2 — incluye la CORRECCIÓN de "El borde posible" (sin etapa hoy).
  update experiencias e set etapa_id = v_etapa_id, modulo_id = v_mod2, orden = v.orden
  from (values
    ('¿Hasta donde te bancas crecer?', 1),
    ('Reconocer y despedir la versión chica', 2),
    ('Volver a tomar el volante', 3),
    ('El borde posible', 4),
    ('Habitar la versión que puede sostenerlo', 5)
  ) as v(titulo, orden)
  where normalizar_titulo(e.titulo) = normalizar_titulo(v.titulo);

  -- Módulo 3
  update experiencias e set etapa_id = v_etapa_id, modulo_id = v_mod3, orden = v.orden
  from (values
    ('Automático vs Intención', 1),
    ('Reconocer mi automático', 2),
    ('Salir del impulso', 3),
    ('Diseñar mi entorno interno', 4),
    ('Diseñar mi entorno externo', 5)
  ) as v(titulo, orden)
  where normalizar_titulo(e.titulo) = normalizar_titulo(v.titulo);

  -- Módulo 4 — incluye la CORRECCIÓN de "La mujer que puede sostenerlo"
  -- (hoy en DISEÑÁ). "Elegir desde mi identidad futura" se asigna al
  -- módulo pero NO se publica: su `estado` no se toca acá.
  update experiencias e set etapa_id = v_etapa_id, modulo_id = v_mod4, orden = v.orden
  from (values
    ('Diseño de tu nueva identidad', 1),
    ('Guardiana de mis sueños', 2),
    ('La mujer que puede sostenerlo', 3),
    ('Elegir desde mi identidad futura', 4)
  ) as v(titulo, orden)
  where normalizar_titulo(e.titulo) = normalizar_titulo(v.titulo);
end $$;

-- ---------- Verificación (solo lectura) ----------
-- Correr esto después del script y confirmar que da 23 filas, cada una
-- con su modulo_id y etapa asignados, antes de dar por buena la
-- reorganización en producción.
-- select e.titulo, et.nombre as etapa, m.titulo as modulo, e.orden, e.estado
-- from experiencias e
-- left join etapas_ruta et on et.id = e.etapa_id
-- left join modulos_ruta m on m.id = e.modulo_id
-- where m.id is not null
-- order by et.orden, m.orden, e.orden;
