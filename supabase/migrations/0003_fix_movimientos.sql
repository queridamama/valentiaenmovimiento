-- =============================================================
-- Valentía en Movimiento — migración 0003: arregla el trigger de
-- movimientos_semanales, que rompía CUALQUIER insert/update en esa tabla.
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de schema.sql y de
-- 0002_experiencias.sql. No modifica ni vuelve a ejecutar ninguno de los
-- dos, y no borra datos.
--
-- CAUSA EXACTA DEL BUG
-- `public.validar_propiedad_movimiento_o_evidencia()` (definida en
-- supabase/schema.sql) está pegada a DOS triggers — uno en
-- `movimientos_semanales` y otro en `evidencias` — y hace referencia a
-- `NEW.movimiento_id`. Esa columna existe en `evidencias` pero NO existe
-- en `movimientos_semanales`. La condición está guardada con
-- `TG_TABLE_NAME = 'evidencias' AND NEW.movimiento_id IS NOT NULL AND ...`,
-- pero PL/pgSQL compila esa expresión completa como una sola consulta SQL
-- contra el tipo de fila de NEW en cada tabla donde el trigger corre —
-- necesita resolver el nombre de la columna al preparar esa consulta,
-- ANTES de evaluar el AND en tiempo de ejecución. El cortocircuito lógico
-- del AND no salva esto: para una fila de `movimientos_semanales`, Postgres
-- no puede ni siquiera preparar la expresión porque esa tabla no tiene
-- columna `movimiento_id`, y tira:
--   record "new" has no field "movimiento_id"
-- Como el trigger corre BEFORE INSERT OR UPDATE, cualquier alta o edición
-- de un movimiento (por ejemplo, tocar "Confirmar mi movimiento" en
-- /movimiento) fallaba siempre, incluso cuando la fila era perfectamente
-- válida y la usuaria tenía todos los permisos correctos.
--
-- SOLUCIÓN
-- Separar la función compartida en dos funciones dedicadas — una por
-- tabla — para que ninguna de las dos referencie una columna que no le
-- corresponde. Cada una valida exactamente lo que su tabla puede tener:
--   - movimientos_semanales: sueno_id, proyecto_id
--   - evidencias:            sueno_id, proyecto_id, movimiento_id
-- La función vieja compartida queda sin triggers que la usen y se borra.
-- =============================================================

drop trigger if exists validar_propiedad_movimiento on movimientos_semanales;
drop trigger if exists validar_propiedad_evidencia on evidencias;

create or replace function public.validar_propiedad_movimiento()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.sueno_id is not null and not exists (
    select 1 from suenos s where s.id = new.sueno_id and s.usuario_id = new.usuario_id
  ) then
    raise exception 'El sueño no pertenece a esta usuaria';
  end if;

  if new.proyecto_id is not null and not exists (
    select 1 from proyectos_valentia p where p.id = new.proyecto_id and p.usuario_id = new.usuario_id
  ) then
    raise exception 'El proyecto no pertenece a esta usuaria';
  end if;

  return new;
end;
$$;

create or replace function public.validar_propiedad_evidencia()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.sueno_id is not null and not exists (
    select 1 from suenos s where s.id = new.sueno_id and s.usuario_id = new.usuario_id
  ) then
    raise exception 'El sueño no pertenece a esta usuaria';
  end if;

  if new.proyecto_id is not null and not exists (
    select 1 from proyectos_valentia p where p.id = new.proyecto_id and p.usuario_id = new.usuario_id
  ) then
    raise exception 'El proyecto no pertenece a esta usuaria';
  end if;

  if new.movimiento_id is not null and not exists (
    select 1 from movimientos_semanales m where m.id = new.movimiento_id and m.usuario_id = new.usuario_id
  ) then
    raise exception 'El movimiento no pertenece a esta usuaria';
  end if;

  return new;
end;
$$;

create trigger validar_propiedad_movimiento
  before insert or update on movimientos_semanales
  for each row execute procedure public.validar_propiedad_movimiento();

create trigger validar_propiedad_evidencia
  before insert or update on evidencias
  for each row execute procedure public.validar_propiedad_evidencia();

-- Ya no queda ningún trigger usando la función compartida vieja.
drop function if exists public.validar_propiedad_movimiento_o_evidencia();
