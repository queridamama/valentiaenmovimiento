// Lógica pura de la integración con Mercado Pago: sin red, sin base de
// datos, sin "server-only" — a propósito, para poder testearla de verdad
// desde un script plano (ver scripts/mercadopago/pruebas-sincronizacion.ts)
// sin necesitar credenciales reales ni un proyecto Supabase. Todo lo que
// SÍ hace I/O (fetch a la API de Mercado Pago, lectura/escritura en
// Supabase) vive en lib/mercadopago.ts y lib/suscripciones.ts, que
// importan estas funciones en vez de duplicar las reglas.

import { createHmac, timingSafeEqual } from "node:crypto";

// Estados reales del recurso Preapproval de Mercado Pago. Ojo: es
// "canceled" (una sola "l"), no "cancelled" — así lo documenta la API
// actual (PUT /preapproval/{id} con status: "canceled"). Escribirlo con
// dos "l" no rompe nada a nivel de TypeScript, pero nunca va a matchear
// un estado real que devuelva Mercado Pago.
export type EstadoPreapproval = "pending" | "authorized" | "paused" | "canceled";

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

// ---------- URL de notificación propia ----------
// Arma la URL exacta que se manda a Mercado Pago como `notification_url`
// al crear cada suscripción (ver conNotificationUrl en
// lib/mercadopago.ts) — pura, sin red, para poder testear que el token
// queda bien puesto en la URL sin necesitar credenciales.
export function construirUrlWebhook(params: { appUrl: string; token: string }): string {
  const base = params.appUrl.replace(/\/$/, "");
  return `${base}/api/webhooks/mercadopago?token=${encodeURIComponent(params.token)}`;
}

// ---------- Acceso vigente y "pagado hasta" ----------
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

// "authorized" siempre tiene acceso vigente. "pending" nunca (todavía no
// pagó nada). "paused"/"canceled" conservan acceso solo si ya pagaron un
// período que todavía no terminó (fechaProximoPago en el futuro).
export function esAccesoVigente(status: EstadoPreapproval, fechaProximoPago: string | null, ahora: number = Date.now()): boolean {
  if (status === "authorized") return true;
  if (status === "pending") return false;
  if (!fechaProximoPago) return false;
  return new Date(fechaProximoPago).getTime() > ahora;
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
