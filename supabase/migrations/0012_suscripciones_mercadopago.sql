-- =============================================================
-- Valentía en Movimiento — migración 0012: integración de Mercado Pago
-- Suscripciones (Preapproval). Aditiva y segura — no borra ni resetea
-- `autorizaciones`, no toca ningún Premium ya otorgado.
--
-- Qué agrega:
--   1. `suscripciones`: historial/estado real de la relación con
--      Mercado Pago. `autorizaciones.nivel` sigue siendo lo que toda la
--      app ya usa para gatear acceso — esta tabla es la fuente de verdad
--      de POR QUÉ una usuaria es Premium (o dejó de serlo), no un
--      reemplazo.
--   2. `autorizaciones.origen_nivel`: distingue un Premium otorgado a
--      mano desde Admin (cortesías, pruebas, alumnas históricas) de uno
--      activado por Mercado Pago. Es la pieza que evita que un webhook
--      de Mercado Pago le baje el nivel a alguien que Melisa activó
--      manualmente — el webhook SOLO downgradea si origen_nivel =
--      'mercadopago'. Default 'manual': todo Premium/Gratis que ya
--      exista hoy en la base (sin este campo) queda protegido por
--      default, exactamente el comportamiento que hay que preservar.
-- =============================================================

alter table autorizaciones
  add column if not exists origen_nivel text not null default 'manual' check (origen_nivel in ('manual', 'mercadopago'));

comment on column autorizaciones.origen_nivel is 'Quién otorgó el nivel actual: "manual" (Admin: cortesía, prueba, alumna histórica) o "mercadopago" (pago real). Un webhook de Mercado Pago solo puede bajar el nivel si origen_nivel = ''mercadopago'' — nunca pisa un Premium manual. Cambiar el nivel desde Admin siempre vuelve a marcar "manual", incluso si antes era de Mercado Pago (el admin tiene la última palabra).';

create table if not exists suscripciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  proveedor text not null default 'mercadopago' check (proveedor in ('mercadopago')),
  -- id del preapproval en Mercado Pago (la "suscripción" real). Único:
  -- es la clave de idempotencia de todo el webhook.
  proveedor_suscripcion_id text unique,
  proveedor_plan_id text,
  -- Nuestro identificador enviado como external_reference al crear el
  -- preapproval — permite reencontrar a la usuaria aunque el webhook
  -- llegue sin más contexto. Ver lib/mercadopago.ts.
  external_reference text not null,
  -- Estados reales de Mercado Pago Preapproval: pending | authorized |
  -- paused | cancelled. No se inventan estados propios para no perder
  -- información de lo que Mercado Pago realmente informa.
  estado text not null default 'pending' check (estado in ('pending', 'authorized', 'paused', 'cancelled')),
  monto numeric,
  moneda text default 'ARS',
  payer_email text,
  fecha_inicio timestamptz,
  fecha_ultimo_pago timestamptz,
  -- Próximo cobro programado según Mercado Pago (`next_payment_date` del
  -- recurso Preapproval). Se usa también como "pagado hasta" al cancelar:
  -- si la usuaria cancela a mitad de ciclo, conserva Premium hasta esta
  -- fecha en vez de cortarle el acceso que ya pagó. Ver nota de límite
  -- conocido en lib/mercadopago.ts sobre este campo.
  fecha_proximo_pago timestamptz,
  cancelada_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (usuario_id, proveedor)
);

comment on table suscripciones is 'Historial/estado real de la relación de una usuaria con Mercado Pago Suscripciones. autorizaciones.nivel sigue siendo lo que gatea acceso; esta tabla es el detalle de por qué. Solo la escribe el webhook (service role) o una server action explícita de cancelación — nunca la usuaria directo.';

create index if not exists suscripciones_usuario_id_idx on suscripciones (usuario_id);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table suscripciones enable row level security;

-- La usuaria (o staff, para soporte) puede LEER su propia suscripción.
-- A propósito no hay policy de insert/update/delete para usuarias: los
-- únicos escritores son el webhook (cliente de servicio, bypassea RLS) y
-- la cancelación manual desde Perfil, que también corre server-side con
-- el cliente de servicio después de confirmar la cancelación en Mercado
-- Pago — nunca un UPDATE directo desde el navegador.
create policy "suscripciones_select_propia" on suscripciones for select using (
  usuario_id = auth.uid() or es_staff()
);
