-- =============================================================
-- Valentía en Movimiento — migración 0016: `modalidad` (observabilidad).
--
-- Prueba en paralelo de un segundo flujo oficial de Mercado Pago
-- ("Suscripciones sin plan asociado" + pago pendiente + checkout alojado
-- por Mercado Pago, init_point) al lado del flujo actual en producción
-- (Card Form + card_token_id + status authorized). Ninguno de los dos
-- reemplaza al otro todavía — ver crearPreapproval() vs.
-- crearPreapprovalSinPlan() en lib/mercadopago.ts.
--
-- `modalidad` es SOLO para poder distinguir en Supabase/logs qué flujo
-- generó cada fila mientras se prueban los dos en paralelo. A propósito
-- NO participa en ninguna decisión de acceso: esAccesoVigente,
-- calcularNuevaAutorizacion y calcularAccesoHasta (lib/mercadopago-
-- logica.ts) no la leen ni la reciben como parámetro — la única fuente
-- de verdad de si corresponde Premium sigue siendo el pago realmente
-- "approved" en /authorized_payments/search, sin importar la modalidad.
--
-- Se marca UNA sola vez, apenas se crea el preapproval
-- (marcarModalidadSuscripcion en lib/suscripciones.ts) — el upsert de
-- sincronizarSuscripcion (el que corre en cada sync/polling posterior)
-- nunca incluye esta columna en su UPDATE, así que no se pisa ni se
-- borra en revalidaciones futuras.
--
-- Aditiva y segura: no toca ninguna fila existente más que dejar esta
-- columna en null (todas las suscripciones creadas antes de esta
-- migración, que hoy son del flujo Card Form).
-- =============================================================

alter table suscripciones
  add column if not exists modalidad text check (modalidad is null or modalidad in ('card_form', 'checkout_alojado'));

comment on column suscripciones.modalidad is 'Solo observabilidad durante la prueba en paralelo del checkout alojado de Mercado Pago — nunca participa en qué nivel de acceso corresponde. "card_form": Card Form + card_token_id + status authorized (flujo de producción, ver crearPreapproval en lib/mercadopago.ts). "checkout_alojado": preapproval pending sin plan asociado + init_point (la prueba, ver crearPreapprovalSinPlan). Null en filas creadas antes de esta columna o si todavía no se llegó a marcar.';
