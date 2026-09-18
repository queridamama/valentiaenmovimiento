-- =============================================================
-- Valentía en Movimiento — migración 0015: detalle fino del último cobro.
--
-- `suscripciones.ultimo_pago_estado` (migración 0014) ya guarda el
-- estado real del cobro más reciente (approved/rejected/pending/...),
-- pero no el motivo fino que Mercado Pago documenta en
-- `payment.status_detail` (ej. "accredited", "cc_rejected_high_risk",
-- "cc_rejected_insufficient_amount") — información antifraude/de riesgo
-- útil para loguear y diagnosticar rechazos, sin exponer ningún dato de
-- la tarjeta (es un código fijo que documenta Mercado Pago, no un dato
-- ingresado por la usuaria).
--
-- Aditiva y segura: no toca ninguna fila existente más que dejar esta
-- columna en null (se completa sola en la próxima sincronización de cada
-- suscripción).
-- =============================================================

alter table suscripciones
  add column if not exists ultimo_pago_detalle text;

comment on column suscripciones.ultimo_pago_detalle is 'payment.status_detail del cobro más reciente encontrado en /authorized_payments/search (ej. "accredited", "cc_rejected_high_risk"). Null si todavía no existe ningún cobro asociado, o si el recurso no lo expuso. Nunca contiene datos de la tarjeta — es un código fijo que documenta Mercado Pago. Se usa para loguear/diagnosticar rechazos de forma segura (ver sincronizarSuscripcion en lib/suscripciones.ts).';
