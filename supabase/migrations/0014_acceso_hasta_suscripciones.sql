-- =============================================================
-- Valentía en Movimiento — migración 0014: separar "preapproval
-- authorized" de "pago aprobado".
--
-- Bug real de producción: se activaba Premium únicamente porque
-- preapproval.status === "authorized", sin haber consultado el cobro
-- real. Mercado Pago separa ambas cosas — un preapproval puede seguir
-- "authorized" aunque el cobro de una cuota puntual haya sido rechazado
-- y entre en reintento. Un caso real: se creó el preapproval, la app
-- activó Premium, y minutos después Mercado Pago informó el pago como
-- rechazado — la fila quedó con estado=authorized y
-- fecha_ultimo_pago=null, y la usuaria siguió Premium sin haber pagado.
--
-- `fecha_proximo_pago` tampoco sirve como "pagado hasta": después de un
-- rechazo puede representar una fecha de reintento, no el fin de un
-- período ya pagado. Por eso esta migración agrega dos columnas nuevas,
-- separadas de las que ya existían (que se conservan tal cual, como dato
-- informativo de Mercado Pago):
--
--   - acceso_hasta: la única fecha que determina si hay acceso Premium
--     vigente (ver esAccesoVigente en lib/mercadopago-logica.ts). Solo
--     avanza cuando GET /authorized_payments/search?preapproval_id=
--     confirma un pago con estado real "approved" — nunca por el solo
--     hecho de que el preapproval esté "authorized", y nunca se inventa
--     ni se adelanta con un rechazo o un pago todavía pending/in_process.
--   - ultimo_pago_estado: el estado real del último cobro consultado
--     (approved/rejected/pending/in_process/...), para poder mostrarle a
--     la usuaria un mensaje preciso ("rechazamos tu pago", "estamos
--     confirmando tu pago") en vez de inferirlo del estado del
--     preapproval, que no alcanza para distinguir esos casos.
--
-- Aditiva y segura: no toca ninguna fila existente más que dejar estas
-- dos columnas en null (se completan solas en la próxima sincronización
-- de cada suscripción), y no cambia `autorizaciones` ni ningún Premium
-- ya otorgado.
-- =============================================================

alter table suscripciones
  add column if not exists acceso_hasta timestamptz,
  add column if not exists ultimo_pago_estado text;

comment on column suscripciones.acceso_hasta is 'Fecha hasta la que hay acceso Premium realmente pagado. Solo avanza cuando se confirma un pago aprobado (GET /authorized_payments/search) — nunca por preapproval.status="authorized" solo, y nunca la adelanta un pago rechazado/pendiente. Es la única fecha que usa esAccesoVigente() para decidir vigencia (ver lib/mercadopago-logica.ts); fecha_proximo_pago queda como dato informativo de Mercado Pago ("próximo intento de cobro"), no como fuente de vigencia.';
comment on column suscripciones.ultimo_pago_estado is 'Estado real (approved/rejected/pending/in_process/...) del cobro más reciente encontrado en /authorized_payments/search para este preapproval. Null si todavía no existe ningún cobro asociado. Se usa para mostrarle a la usuaria el motivo exacto (pago rechazado vs. todavía confirmando) sin adivinarlo a partir del estado del preapproval.';
