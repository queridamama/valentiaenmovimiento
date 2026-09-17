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

// ---------- Validación del webhook (x-signature) ----------
// Mercado Pago firma cada notificación con HMAC-SHA256 sobre un
// "manifest" armado con el id del recurso, el x-request-id y el
// timestamp, usando el secreto configurado en la app de Mercado Pago
// (Tus integraciones → Webhooks → "Firma secreta"). Formato del
// manifest documentado por MP: "id:{data.id};request-id:{x-request-id};
// ts:{ts};".
//
// Sin secreto configurado: en desarrollo se deja pasar (para poder
// probar el webhook antes de tener el secreto real), pero en producción
// se rechaza — no hay fail-open productivo. La consulta server-side a
// Mercado Pago (con el ACCESS TOKEN) sigue siendo obligatoria de todos
// modos: esta firma es una capa adicional, no la única defensa.
export function validarFirmaWebhook(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  esProduccion?: boolean;
}): boolean {
  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const esProduccion = params.esProduccion ?? process.env.NODE_ENV === "production";

  if (!secreto) {
    if (esProduccion) {
      console.error("[mercadopago] Falta MERCADOPAGO_WEBHOOK_SECRET en producción — se rechaza el webhook.");
      return false;
    }
    return true;
  }
  if (!params.xSignature || !params.dataId) return false;

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
