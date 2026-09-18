// Lógica pura de la integración con Mercado Pago: sin red, sin base de
// datos, sin "server-only" — a propósito, para poder testearla de verdad
// desde un script plano (ver scripts/mercadopago/pruebas-sincronizacion.ts)
// sin necesitar credenciales reales ni un proyecto Supabase. Todo lo que
// SÍ hace I/O (fetch a la API de Mercado Pago, lectura/escritura en
// Supabase) vive en lib/mercadopago.ts y lib/suscripciones.ts, que
// importan estas funciones en vez de duplicar las reglas.

import { createHmac, timingSafeEqual } from "node:crypto";

// Estados reales del recurso Preapproval de Mercado Pago, ya
// NORMALIZADOS a un solo valor por nuestra cuenta ("canceled", una sola
// "l" — el valor que usa nuestro CHECK constraint en Supabase). Un error
// real de producción mostró que PUT /preapproval/{id} con
// status:"canceled" (el documentado) puede ser rechazado por esta cuenta
// con "Invalid preapproval status param: canceled", y que Mercado Pago
// tiene integraciones históricas que usan "cancelled" (dos "l"). Nunca se
// reemplaza un valor por el otro a ciegas: cancelarPreapproval() (ver
// lib/mercadopago.ts) intenta primero el documentado y solo ante ESE
// error puntual reintenta con la variante alternativa; y cualquier
// "cancelled" que Mercado Pago devuelva en una respuesta (a esta cuenta o
// a cualquier otra) se normaliza acá mismo, en el borde de I/O, a
// "canceled" — el resto del código (este archivo, lib/suscripciones.ts,
// el CHECK de la tabla) nunca necesita saber que existió la variante.
export type EstadoPreapproval = "pending" | "authorized" | "paused" | "canceled";

export function normalizarEstadoPreapproval(status: string): EstadoPreapproval {
  if (status === "cancelled") return "canceled";
  return status as EstadoPreapproval;
}

// Mercado Pago puede rechazar un valor de `status` documentado (ej.
// "canceled") con este mensaje puntual si la cuenta en particular espera
// la variante histórica ("cancelled") — o viceversa. Solo se reintenta
// ante ESTE mensaje exacto (comparado sin importar mayúsculas, por las
// dudas), nunca ante cualquier 400: reintentar ante un error no
// relacionado (token vencido, preapproval inexistente, otro campo
// inválido) ocultaría un problema real en vez de resolverlo.
export function esErrorStatusPreapprovalInvalido(params: { status: number; mensajeMp: string | null }, valorIntentado: string): boolean {
  if (params.status !== 400) return false;
  if (!params.mensajeMp) return false;
  return params.mensajeMp.trim().toLowerCase() === `invalid preapproval status param: ${valorIntentado.toLowerCase()}`;
}

// ---------- Validación del webhook ----------
// Mercado Pago documenta la firma HMAC (header x-signature) como parte
// de la configuración de notificaciones vía "Tus integraciones →
// Webhooks", que genera ahí la "Firma secreta". PERO: para una
// aplicación creada específicamente como "Suscripciones", ese panel de
// Webhooks no aparece dentro de "Tus integraciones" — confirmado contra
// la documentación vigente y la cuenta real de la app. No hay forma de
// obtener esa Firma secreta para este tipo de integración, así que
// exigirla (y menos aún rechazar todo en producción por su ausencia)
// sería bloquear el webhook para siempre, no una medida de seguridad.
//
// Por eso la defensa real acá son DOS cosas que sí controlamos nosotros:
//   1. `validarTokenWebhook`: un secreto propio, elegido por nosotros,
//      que se agrega como query param en la URL que le damos a Mercado
//      Pago para recibir notificaciones (ej. .../api/webhooks/
//      mercadopago?token=XXXX). Mercado Pago hace POST a esa URL tal
//      cual se la dimos, query string incluida — esto no depende de
//      ningún panel ni campo de Mercado Pago, así que si falta en
//      producción SÍ se rechaza (no hay excusa: es enteramente nuestro).
//   2. La verificación server-side obligatoria: pase lo que pase acá,
//      `sincronizarSuscripcion` nunca escribe nada a partir del body de
//      la notificación — siempre vuelve a pedirle el recurso real a la
//      API de Mercado Pago con el ACCESS TOKEN antes de tocar Supabase
//      (ver lib/suscripciones.ts). Esa consulta es la que de verdad
//      impide activar Premium con datos falsos, con o sin firma.
//
// `validarFirmaWebhook` (x-signature) se conserva como capa extra
// puramente oportunista: si Mercado Pago llega a mandar el header (para
// este tipo de app no hay garantía de que lo haga) y hay un secreto
// cargado, se valida y se rechaza ante una firma que no matchea. Nunca
// rechaza solo porque el header no vino — su ausencia no es rara para
// una integración de Suscripciones sin panel de Webhooks.
export function validarTokenWebhook(params: { tokenRecibido: string | null; esProduccion?: boolean }): boolean {
  const tokenEsperado = process.env.MERCADOPAGO_WEBHOOK_TOKEN;
  const esProduccion = params.esProduccion ?? process.env.NODE_ENV === "production";

  if (!tokenEsperado) {
    if (esProduccion) {
      console.error("[mercadopago] Falta MERCADOPAGO_WEBHOOK_TOKEN en producción — se rechaza el webhook.");
      return false;
    }
    return true;
  }
  if (!params.tokenRecibido) return false;

  const bufEsperado = Buffer.from(tokenEsperado);
  const bufRecibido = Buffer.from(params.tokenRecibido);
  if (bufEsperado.length !== bufRecibido.length) return false;
  return timingSafeEqual(bufEsperado, bufRecibido);
}

// Firma HMAC-SHA256 sobre un "manifest" armado con el id del recurso, el
// x-request-id y el timestamp, tal como la documenta Mercado Pago para
// integraciones que sí tienen el panel de Webhooks. Best-effort: ver
// comentario de arriba.
export function validarFirmaWebhook(params: { xSignature: string | null; xRequestId: string | null; dataId: string | null }): boolean {
  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secreto || !params.xSignature) return true; // nada que validar
  if (!params.dataId) return false;

  const partes = Object.fromEntries(
    params.xSignature.split(",").map((par) => {
      const [clave, valor] = par.split("=");
      return [clave?.trim(), valor?.trim()];
    })
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${params.dataId.toLowerCase()};request-id:${params.xRequestId ?? ""};ts:${ts};`;
  const firmaEsperada = createHmac("sha256", secreto).update(manifest).digest("hex");

  const bufEsperado = Buffer.from(firmaEsperada, "hex");
  const bufRecibido = Buffer.from(v1, "hex");
  if (bufEsperado.length !== bufRecibido.length) return false;
  return timingSafeEqual(bufEsperado, bufRecibido);
}

// ---------- Ventana de revalidación server-side ----------
// La activación/mantenimiento/cancelación de Premium no dependen de que
// llegue un webhook (ver nota en lib/mercadopago.ts): en cambio, se
// revalida contra GET /preapproval/{id} de forma perezosa — solo cuando
// el último dato guardado ya es "viejo" — para no pegarle a la API de
// Mercado Pago en cada request. La ventana depende del estado guardado:
//
//   - "pending", o "authorized" sin ningún pago aprobado todavía
//     (acceso_hasta null — la usuaria ya inició el pago pero Mercado
//     Pago todavía no confirmó ningún cobro, o el primero fue rechazado):
//     es exactamente el caso de "pagó, pero nunca volvió bien a
//     /membresia/resultado" (cerró Mercado Pago, se le cortó la
//     conexión, etc.) o el caso del bug real de producción (preapproval
//     authorized, primer cobro todavía sin resolver). Acá conviene una
//     ventana corta: no hay ningún Premium que "mantener" todavía, así
//     que revisar seguido no tiene el costo de una usuaria Premium ya
//     estable, y es justo la ventana crítica en la que queremos
//     enterarnos rápido de qué pasó con ese primer cobro.
//   - cualquier otro caso (ya hay un acceso_hasta guardado, sea que siga
//     vigente o ya haya vencido): ya se resolvió una vez, así que alcanza
//     con la ventana larga de siempre — una usuaria Premium activa entra
//     varias veces por día, la mayoría de esas visitas no generan ningún
//     llamado a la API; y si canceló o se le rechazó una renovación, nos
//     enteramos en horas, no en días.
//
// Ninguno de los dos números lo documenta Mercado Pago: son decisiones
// de producto nuestras. El caso "recién volvió del checkout" no espera
// ninguna de las dos ventanas: `revalidarSuscripcionAhora` (ver
// lib/suscripciones.ts) las ignora a propósito y siempre consulta.
export const VENTANA_REVALIDACION_MS = 6 * 60 * 60 * 1000; // 6 horas
export const VENTANA_REVALIDACION_PENDIENTE_MS = 5 * 60 * 1000; // 5 minutos

export function debeRevalidar(
  actualizadoEnIso: string,
  estado: EstadoPreapproval,
  accesoHasta: string | null,
  ahora: number = Date.now()
): boolean {
  const esperandoPrimerPago = estado === "pending" || (estado === "authorized" && accesoHasta === null);
  const ventana = esperandoPrimerPago ? VENTANA_REVALIDACION_PENDIENTE_MS : VENTANA_REVALIDACION_MS;
  const antiguedadMs = ahora - new Date(actualizadoEnIso).getTime();
  return antiguedadMs >= ventana;
}

// ---------- "Próximo cobro" (informativo, NO decide vigencia) ----------
// GET /preapproval/{id} sí expone `next_payment_date` (confirmado contra
// la documentación oficial de Mercado Pago) — la cautela real no es si
// el campo existe, sino qué trae la respuesta INMEDIATAMENTE después de
// cancelar: no hay garantía de que Mercado Pago siga devolviendo la
// fecha del período ya pagado en ese mismo momento. Por eso, si la
// respuesta nueva viene sin next_payment_date pero el estado pasó a
// paused/canceled, se conserva la última fecha confiable que ya
// teníamos guardada — nunca se inventa una fecha que nunca existió (si
// nunca hubo next_payment_date, el resultado es null y no hay período de
// gracia que preservar).
//
// OJO: esto es puramente informativo ("próximo intento de cobro" en
// Perfil) — desde el bug real de producción de "authorized sin pago
// aprobado", `next_payment_date` YA NO decide si hay acceso vigente,
// porque después de un cobro rechazado puede representar una fecha de
// reintento, no el fin de un período realmente pagado. Ver acceso_hasta
// / esAccesoVigente más abajo, que es lo único que decide vigencia.
export function calcularFechaProximoPago(params: {
  nextPaymentDateNueva: string | null;
  status: EstadoPreapproval;
  fechaProximoPagoExistente: string | null;
}): string | null {
  if (params.nextPaymentDateNueva) return params.nextPaymentDateNueva;
  if ((params.status === "canceled" || params.status === "paused") && params.fechaProximoPagoExistente) {
    return params.fechaProximoPagoExistente;
  }
  return null;
}

// ---------- Pago real vs. estado del preapproval ----------
// Mercado Pago separa dos conceptos: el preapproval (la "suscripción")
// puede seguir en status "authorized" aunque el cobro de una cuota
// puntual haya sido rechazado y entre en reintento — "authorized" en el
// preapproval NUNCA es sinónimo de "pago aprobado". Este es exactamente
// el bug real de producción que motiva esta sección: se activó Premium
// solo por preapproval.status === "authorized", sin que existiera ningún
// pago aprobado. La única fuente de verdad de si se cobró algo de verdad
// es el cobro concreto — GET /authorized_payments/search?preapproval_id=
// (ver buscarPagosAutorizados en lib/mercadopago.ts) — nunca el status
// del preapproval solo.
export interface InfoPagoAutorizado {
  // Estado del recurso "Authorized Payment" en sí. Según la integración,
  // el estado real del cobro (approved/rejected/in_process/pending/...)
  // puede venir en este campo de primer nivel o anidado en `payment`
  // (ver PagoAutorizado en lib/mercadopago.ts) — no está confirmado cuál
  // usa esta cuenta en particular, así que se leen los dos.
  status?: string | null;
  paymentStatus?: string | null;
  dateCreated?: string | null;
}

// El cobro más reciente por fecha de creación — los resultados de
// /authorized_payments/search no vienen con orden garantizado. Si dos
// traen exactamente la misma fecha (no debería pasar), se queda con
// cualquiera de los dos: no cambia la decisión (misma fecha).
export function pagoMasReciente(pagos: InfoPagoAutorizado[]): InfoPagoAutorizado | null {
  if (pagos.length === 0) return null;
  return pagos.reduce((masReciente, actual) => {
    const fechaActual = actual.dateCreated ? Date.parse(actual.dateCreated) : -Infinity;
    const fechaMasReciente = masReciente.dateCreated ? Date.parse(masReciente.dateCreated) : -Infinity;
    return fechaActual >= fechaMasReciente ? actual : masReciente;
  });
}

// `payment.status` (el estado del Payment real, cuando el recurso lo
// expone anidado) gana sobre el `status` de primer nivel del Authorized
// Payment, que en algunas integraciones es el estado del recurso de
// cobro programado (scheduled/processed/...) y no el del pago en sí.
export function estadoPagoReal(pago: InfoPagoAutorizado | null): string | null {
  if (!pago) return null;
  return pago.paymentStatus ?? pago.status ?? null;
}

// Solo "approved" cuenta como pago exitoso. `status_detail=accredited`
// (cuando el recurso lo expone) sería una confirmación más fina, pero no
// está garantizado que todos los medios de pago lo completen — exigirlo
// siempre podría dejar afuera cobros legítimos que Mercado Pago ya marcó
// approved por otro medio. Por eso el criterio duro y confiable es
// exclusivamente `status === "approved"`.
export function esPagoAprobado(pago: InfoPagoAutorizado | null): boolean {
  return estadoPagoReal(pago) === "approved";
}

// ---------- acceso_hasta: lo único que decide vigencia ----------
// Reemplaza el uso de next_payment_date/fecha_proximo_pago como "pagado
// hasta" (ver nota arriba). Solo avanza cuando el cobro más reciente está
// realmente aprobado — nunca por un preapproval "authorized" sin más,
// nunca por un cobro rejected/pending/in_process, y nunca se inventa una
// fecha que Mercado Pago no mandó.
export function calcularAccesoHasta(params: {
  pagoAprobado: boolean;
  nextPaymentDateNueva: string | null;
  accesoHastaExistente: string | null;
}): string | null {
  if (params.pagoAprobado && params.nextPaymentDateNueva) return params.nextPaymentDateNueva;
  return params.accesoHastaExistente;
}

// Único criterio de vigencia de Premium por Mercado Pago: hay acceso
// mientras `acceso_hasta` siga en el futuro, sin importar el status del
// preapproval (authorized/paused/canceled) — un preapproval cancelado a
// mitad de ciclo conserva acceso hasta el fin del período ya pagado,
// exactamente igual que uno todavía "authorized" cuyo último cobro fue
// rechazado no tiene acceso si nunca hubo un pago aprobado antes.
export function esAccesoVigente(accesoHasta: string | null, ahora: number = Date.now()): boolean {
  return accesoHasta !== null && new Date(accesoHasta).getTime() > ahora;
}

export interface AutorizacionActual {
  nivel: "gratis" | "premium";
  origenNivel: "manual" | "mercadopago";
}

export type DecisionAutorizacion = { debeEscribir: false } | { debeEscribir: true; nivel: "gratis" | "premium"; origenNivel: "mercadopago" };

// La única regla de protección es esta combinación exacta: nivel YA
// premium Y origen YA manual. Un Gratis con origen "manual" (el default
// de cualquier cuenta nueva, incluso la que nunca tocó Admin) SÍ puede
// pasar a Premium por Mercado Pago — "manual" ahí no significa "no
// tocar", significa "todavía no hay un pago real que lo explique".
export function calcularNuevaAutorizacion(params: {
  autorizacionActual: AutorizacionActual | null;
  vigente: boolean;
}): DecisionAutorizacion {
  const actual = params.autorizacionActual;

  if (actual?.nivel === "premium" && actual?.origenNivel === "manual") {
    return { debeEscribir: false };
  }

  const nivelObjetivo: "gratis" | "premium" = params.vigente ? "premium" : "gratis";
  if (actual?.nivel === nivelObjetivo && actual?.origenNivel === "mercadopago") {
    return { debeEscribir: false };
  }

  return { debeEscribir: true, nivel: nivelObjetivo, origenNivel: "mercadopago" };
}
