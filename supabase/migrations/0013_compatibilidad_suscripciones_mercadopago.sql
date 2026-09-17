-- =============================================================
-- Valentía en Movimiento — migración 0013: compatibilidad de
-- `suscripciones` con Mercado Pago Suscripciones.
--
-- Qué pasó: `supabase/schema.sql` (Fase 0) ya traía una tabla
-- `suscripciones` histórica y vacía —
--   id uuid, usuario_id uuid,
--   estado text check (estado in ('activa','vencida','cancelada')),
--   fecha_inicio timestamptz not null default now(),
--   fecha_vencimiento timestamptz,
--   mp_subscription_id text
-- — con `pagos.suscripcion_id` como FK hacia ella. La migración 0012
-- traía un `create table if not exists suscripciones (...)` pensado para
-- un proyecto sin esa tabla: como ya existía, ese CREATE TABLE completo
-- se saltó silenciosamente y ninguna de las columnas nuevas (proveedor,
-- proveedor_suscripcion_id, external_reference, etc.) se creó. El resto
-- de 0012 (columna `autorizaciones.origen_nivel`, RLS, índice) sí corrió,
-- porque son sentencias sueltas fuera de ese CREATE TABLE.
--
-- Esta migración ADAPTA la tabla existente en vez de reemplazarla (no se
-- puede: `pagos` depende de su `id` por FK). Ya fue aplicada en
-- producción a mano como "compatibilidad_suscripciones_mercadopago" —
-- este archivo solo deja el repo y el historial de migraciones
-- sincronizados con lo que ya existe en la base real. NO ejecutar de
-- nuevo contra producción.
-- =============================================================

-- ---------- 1. Columnas nuevas (nullable por ahora — se ajustan
-- default/NOT NULL en el paso 4, después de migrar los datos) ----------
alter table suscripciones
  add column if not exists proveedor text,
  add column if not exists proveedor_suscripcion_id text,
  add column if not exists proveedor_plan_id text,
  add column if not exists external_reference text,
  add column if not exists monto numeric,
  add column if not exists moneda text,
  add column if not exists payer_email text,
  add column if not exists fecha_ultimo_pago timestamptz,
  add column if not exists fecha_proximo_pago timestamptz,
  add column if not exists cancelada_en timestamptz,
  add column if not exists creado_en timestamptz,
  add column if not exists actualizado_en timestamptz;

-- ---------- 2. Migrar compatibilidad histórica ----------
-- No hay filas hoy (la tabla está vacía), pero se corre igual: es lo
-- correcto si alguna vez hay una fila vieja que pasar, y no hace nada
-- sobre una tabla vacía.
update suscripciones set proveedor = 'mercadopago' where proveedor is null;

update suscripciones set proveedor_suscripcion_id = mp_subscription_id
  where proveedor_suscripcion_id is null and mp_subscription_id is not null;

update suscripciones set external_reference = usuario_id::text where external_reference is null;

update suscripciones set moneda = 'ARS' where moneda is null;

update suscripciones set creado_en = coalesce(creado_en, fecha_inicio, now()) where creado_en is null;
update suscripciones set actualizado_en = coalesce(actualizado_en, now()) where actualizado_en is null;

-- activa → authorized | vencida → canceled | cancelada → canceled
update suscripciones set estado = 'authorized' where estado = 'activa';
update suscripciones set estado = 'canceled' where estado in ('vencida', 'cancelada');

-- ---------- 3. Reemplazar el CHECK viejo de `estado` ----------
-- Se busca el constraint por definición (no por nombre, que puede variar
-- según cómo lo haya generado Postgres al declararlo inline en
-- `schema.sql`): cualquier CHECK de esta tabla cuya definición mencione
-- la columna `estado` se borra antes de agregar el nuevo.
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'suscripciones'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%estado%'
  loop
    execute format('alter table suscripciones drop constraint %I', r.conname);
  end loop;
end $$;

alter table suscripciones
  add constraint suscripciones_estado_check check (estado in ('pending', 'authorized', 'paused', 'canceled'));

-- ---------- 4. Defaults / NOT NULL finales ----------
alter table suscripciones
  alter column proveedor set default 'mercadopago',
  alter column proveedor set not null,
  alter column external_reference set not null,
  alter column moneda set default 'ARS',
  alter column creado_en set default now(),
  alter column creado_en set not null,
  alter column actualizado_en set default now(),
  alter column actualizado_en set not null,
  alter column estado set default 'pending',
  -- El schema viejo la declaraba NOT NULL DEFAULT now(): con Mercado
  -- Pago, `fecha_inicio` se completa recién cuando el preapproval queda
  -- autorizado, así que tiene que poder quedar en null mientras tanto
  -- (`pending`).
  alter column fecha_inicio drop not null;

comment on table suscripciones is 'Historial/estado real de la relación de una usuaria con Mercado Pago Suscripciones. autorizaciones.nivel sigue siendo lo que gatea acceso; esta tabla es el detalle de por qué. Solo la escribe el webhook (service role) o una server action explícita de cancelación — nunca la usuaria directo. mp_subscription_id y fecha_vencimiento son columnas legacy de una versión anterior de esta tabla — se conservan por compatibilidad (pagos.suscripcion_id referencia esta tabla por id) pero ya no se escriben: usar proveedor_suscripcion_id y fecha_proximo_pago/cancelada_en.';

comment on column suscripciones.mp_subscription_id is 'Legacy — reemplazada por proveedor_suscripcion_id. Se conserva por compatibilidad histórica, no se escribe más.';
comment on column suscripciones.fecha_vencimiento is 'Legacy — reemplazada por fecha_proximo_pago/cancelada_en. Se conserva por compatibilidad histórica, no se escribe más.';

-- ---------- 5. Índices únicos ----------
-- Único cuando no es null: un mismo preapproval de Mercado Pago no puede
-- pertenecer a dos usuarias, pero varias filas pendientes sin
-- proveedor_suscripcion_id todavía (no debería pasar, pero por las
-- dudas) no deben chocar entre sí.
create unique index if not exists suscripciones_proveedor_suscripcion_id_key
  on suscripciones (proveedor_suscripcion_id)
  where proveedor_suscripcion_id is not null;

create unique index if not exists suscripciones_usuario_id_proveedor_key
  on suscripciones (usuario_id, proveedor);

-- ---------- 6. Una sola policy de SELECT ----------
-- `schema.sql` ya traía "suscripciones_lectura_propia" y 0012 agregó
-- "suscripciones_select_propia" encima (misma condición, policy
-- duplicada) porque no sabía que la tabla — y su policy — ya existían.
-- Se borran TODAS las policies de select existentes en la tabla (sea
-- cual sea su nombre) y se deja una sola, con el nombre original de
-- schema.sql.
alter table suscripciones enable row level security;

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'suscripciones' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on suscripciones', r.policyname);
  end loop;
end $$;

create policy "suscripciones_lectura_propia" on suscripciones for select using (
  usuario_id = auth.uid() or es_staff()
);

-- ---------- 7. Columnas legacy ----------
-- `mp_subscription_id` y `fecha_vencimiento` NO se borran: quedan como
-- referencia histórica (ver comentarios en el paso 4). Ningún código
-- nuevo las lee ni las escribe.
