import "server-only";
import { PREMIUM_PLAN } from "@/lib/config/premium";
import { normalizarEstadoPreapproval, esErrorStatusPreapprovalInvalido, type EstadoPreapproval } from "@/lib/mercadopago-logica";

export type { EstadoPreapproval } from "@/lib/mercadopago-logica";
export { validarTokenWebhook, validarFirmaWebhook } from "@/lib/mercadopago-logica";

// Todo esto habla con la API REST de Mercado Pago directo por fetch — no
// hace falta el SDK oficial para dos endpoints (preapproval,
// preapproval_plan). El ACCESS TOKEN nunca sale de este archivo/del
// servidor: todas las funciones son server-only y ninguna se expone como
// Server Action (no llevan "use server"), se llaman desde código de
// servidor (route handlers, server actions, Server Components).
//
// La lógica de decisión (qué estado de acceso corresponde, cuándo
// preservar la fecha de "pagado hasta", validación de firma del webhook)
// vive en lib/mercadopago-logica.ts, sin "server-only" — así se puede
// testear con un script plano sin credenciales (ver
// scripts/mercadopago/pruebas-sincronizacion.ts). Este archivo es solo
// I/O: los fetch reales a la API de Mercado Pago.

const API_BASE = "https://api.mercadopago.com";

function accessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Falta configurar MERCADOPAGO_ACCESS_TOKEN.");
  return token;
}

// Error estructurado (no solo un mensaje de texto) para poder: (a) verlo
// en los logs sin adivinarlo, y (b) que quien llama pueda tomar
// decisiones programáticas sobre un error puntual (ver
// esErrorStatusPreapprovalInvalido/cancelarPreapproval más abajo) sin
// tener que parsear el mensaje. Nunca lleva el access token, el token de
// tarjeta, ni ningún dato de pago — `mensajeMp`/`errorSlug`/`causa` son
// el motivo del rechazo que documenta Mercado Pago, no la tarjeta.
export class MercadoPagoApiError extends Error {
  readonly status: number;
  readonly mensajeMp: string | null;
  readonly errorSlug: string | null;

  constructor(path: string, status: number, mensajeMp: string | null, errorSlug: string | null, detalle: string) {
    super(`Mercado Pago ${path} respondió ${status}: ${detalle}`);
    this.name = "MercadoPagoApiError";
    this.status = status;
    this.mensajeMp = mensajeMp;
    this.errorSlug = errorSlug;
  }
}

async function mpFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken()}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) {
    // Nunca se loguea el access token, ni el token de tarjeta, ni ningún
    // dato de pago — pero SÍ conviene ver el detalle real que manda
    // Mercado Pago (status HTTP, el slug de `error` y el/los código y
    // descripción de `cause`, ej. "invalid_token" o "card_token_id is
    // required") para poder diagnosticar un fallo real de producción
    // (ej. cancelación) sin tener que adivinarlo solo por el status.
    // Ninguno de estos tres campos documenta datos sensibles: son el
    // motivo del rechazo, no la tarjeta.
    const causa = Array.isArray(cuerpo?.cause)
      ? cuerpo.cause
          .map((c: { code?: string | number; description?: string }) => `${c.code ?? "?"}${c.description ? `: ${c.description}` : ""}`)
          .join("; ")
      : undefined;
    const detalle = [cuerpo?.message, cuerpo?.error && `error=${cuerpo.error}`, causa].filter(Boolean).join(" | ") || "sin detalle";
    throw new MercadoPagoApiError(path, res.status, cuerpo?.message ?? null, cuerpo?.error ?? null, detalle);
  }
  return cuerpo as T;
}

export interface Preapproval {
  id: string;
  status: EstadoPreapproval;
  external_reference: string | null;
  payer_email?: string;
  preapproval_plan_id?: string;
  reason?: string;
  date_created?: string;
  last_modified?: string;
  next_payment_date?: string;
  init_point?: string;
  auto_recurring?: {
    frequency: number;
    frequency_type: string;
    transaction_amount: number;
    currency_id: string;
  };
  summarized?: {
    last_charged_date?: string;
    last_charged_amount?: number;
  };
}

// Recurso "Authorized Payment" — tanto el que devuelve
// GET /authorized_payments/{id} como cada elemento de
// GET /authorized_payments/search?preapproval_id=. Es el cobro puntual
// de una cuota de la suscripción, DISTINTO del estado del preapproval en
// sí (ver el comentario grande en lib/mercadopago-logica.ts): un
// preapproval puede seguir "authorized" con un cobro "rejected" acá.
//
// `status` (primer nivel, del recurso Authorized Payment) y
// `payment.status` (anidado, del Payment real) no están confirmados como
// el mismo campo en todas las integraciones — se declaran los dos como
// opcionales y se leen ambos (ver estadoPagoReal en
// lib/mercadopago-logica.ts) en vez de apostar a uno solo.
export interface PagoAutorizado {
  id: number | string;
  preapproval_id: string;
  status?: string;
  payment?: {
    id?: number | string;
    status?: string;
    status_detail?: string;
  };
  transaction_amount?: number;
  date_created?: string;
}

// Normaliza el `status` crudo que devuelve Mercado Pago (puede venir
// "cancelled", variante histórica — ver normalizarEstadoPreapproval en
// lib/mercadopago-logica.ts) a nuestro único valor interno ANTES de que
// el resultado salga de este archivo — así el resto del código nunca
// tiene que contemplar la variante.
function normalizarPreapproval(cuerpo: Record<string, unknown> & { status: string }): Preapproval {
  return { ...(cuerpo as unknown as Preapproval), status: normalizarEstadoPreapproval(cuerpo.status) };
}

function planId(): string {
  const id = process.env.MERCADOPAGO_PREAPPROVAL_PLAN_ID;
  if (!id) throw new Error("Falta configurar MERCADOPAGO_PREAPPROVAL_PLAN_ID.");
  return id;
}

// Crea una suscripción (preapproval) asociada al plan único de Valentía
// Premium. `external_reference` es nuestro usuario_id — no es secreto,
// pero tampoco hace falta que lo sea: nunca se confía en un
// external_reference que llegue desde el navegador/query string, solo en
// el que devuelve una consulta autenticada server-side a la API de MP.
// Eso es lo que evita que alguien active Premium propio mandando un
// external_reference ajeno.
//
// `cardTokenId` + `status: "authorized"` — no `pending` — es el flujo
// confirmado por el error real de producción ("card_token_id is
// required") y por la documentación vigente: una suscripción con plan
// asociado se crea directamente autorizada, con el token de tarjeta ya
// generado client-side (Card Form de @mercadopago/sdk-js, ver
// components/BotonSuscribirse.tsx — el número/CVV viajan dentro de
// iframes de Mercado Pago, nunca tocan nuestro JS ni nuestro backend).
// El modelo "pending sin medio de pago, esperando un init_point" que
// usaba esta función antes es el de Suscripciones SIN plan asociado —
// no el nuestro.
//
// OJO — que esta llamada devuelva status "authorized" NO significa que
// haya un pago aprobado: es el estado del preapproval, no del cobro. Un
// bug real de producción activó Premium solo por esto, y minutos después
// Mercado Pago informó el cobro real como rechazado. Quien llama a esta
// función SIEMPRE tiene que pasar el resultado por sincronizarSuscripcion
// (lib/suscripciones.ts), que es quien de verdad confirma el pago
// consultando buscarPagosAutorizados antes de otorgar Premium — nunca
// alcanza con mirar el `status` que devuelve este POST.
//
// A propósito NO manda `notification_url`: el código fuente oficial de
// los SDK de Go y PHP para crear un preapproval no declara ese campo en
// su tipo de request (github.com/mercadopago/sdk-go/pkg/preapproval:
// auto_recurring, card_token_id, preapproval_plan_id, payer_email,
// back_url, collector_id, reason, external_reference, status — nada de
// notification_url), así que no está confirmado como parte del schema
// real del endpoint. La activación/mantenimiento/cancelación de Premium
// NO dependen de que llegue ningún webhook — ver lib/suscripciones.ts
// (revalidación server-side por polling contra GET /preapproval/{id}).
//
// `deviceId`, si vino, se manda como header `X-meli-session-id` — es el
// Device ID antifraude que la documentación oficial de Mercado Pago para
// Suscripciones recomienda para mejorar la aprobación de pagos. Lo genera
// el script de seguridad de Mercado Pago en el navegador
// (`window.MP_DEVICE_SESSION_ID`, ver components/BotonSuscribirse.tsx) —
// es información técnica del dispositivo/sesión, nunca un dato de la
// tarjeta. Es opcional a propósito: si el script no llegó a generarlo a
// tiempo, se crea igual el preapproval sin el header en vez de bloquear
// la suscripción por un dato que Mercado Pago documenta como
// recomendado, no requerido.
export async function crearPreapproval(params: {
  payerEmail: string;
  externalReference: string;
  backUrl: string;
  cardTokenId: string;
  deviceId: string | null;
}): Promise<Preapproval> {
  const cuerpo = await mpFetch<Record<string, unknown> & { status: string }>("/preapproval", {
    method: "POST",
    headers: params.deviceId ? { "X-meli-session-id": params.deviceId } : undefined,
    body: JSON.stringify({
      preapproval_plan_id: planId(),
      reason: PREMIUM_PLAN.reason,
      external_reference: params.externalReference,
      payer_email: params.payerEmail,
      card_token_id: params.cardTokenId,
      back_url: params.backUrl,
      status: "authorized",
    }),
  });
  return normalizarPreapproval(cuerpo);
}

export async function obtenerPreapproval(id: string): Promise<Preapproval> {
  const cuerpo = await mpFetch<Record<string, unknown> & { status: string }>(`/preapproval/${encodeURIComponent(id)}`);
  return normalizarPreapproval(cuerpo);
}

// Mercado Pago documenta `status: "canceled"` (una sola "l") para
// PUT /preapproval/{id} — pero un error real de producción mostró que
// nuestra cuenta lo rechaza con 400 "Invalid preapproval status param:
// canceled". Mercado Pago tiene integraciones históricas que usan
// "cancelled" (dos "l"); no hay forma de saber cuál acepta esta cuenta
// sin probar, así que NUNCA se reemplaza un valor por el otro a ciegas:
//
//   1. Primer intento: el valor documentado, "canceled".
//   2. Si (y SOLO si) Mercado Pago responde exactamente con ese 400 +
//      "Invalid preapproval status param: canceled", segundo y último
//      intento con la variante histórica, "cancelled".
//   3. Cualquier otro error (401, 404, otro 400 distinto, o el segundo
//      intento fallando también) se propaga tal cual — nunca se llama a
//      sincronizarSuscripcion con datos parciales, así que Supabase
//      nunca queda tocado si la cancelación real falló.
//
// El resultado (cualquiera de los dos intentos que haya funcionado) pasa
// por normalizarPreapproval, así que quien llama a esta función siempre
// recibe `status: "canceled"` sin importar cuál de los dos aceptó Mercado
// Pago.
export async function cancelarPreapproval(id: string): Promise<Preapproval> {
  const intentar = (status: "canceled" | "cancelled") =>
    mpFetch<Record<string, unknown> & { status: string }>(`/preapproval/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });

  try {
    return normalizarPreapproval(await intentar("canceled"));
  } catch (err) {
    if (!(err instanceof MercadoPagoApiError) || !esErrorStatusPreapprovalInvalido({ status: err.status, mensajeMp: err.mensajeMp }, "canceled")) {
      throw err;
    }
    console.error(
      '[mercadopago] la cuenta rechazó status "canceled" (Invalid preapproval status param) — reintentando la cancelación con la variante histórica "cancelled"',
      id
    );
    return normalizarPreapproval(await intentar("cancelled"));
  }
}

export async function obtenerAuthorizedPayment(id: string | number): Promise<PagoAutorizado> {
  return mpFetch<PagoAutorizado>(`/authorized_payments/${encodeURIComponent(String(id))}`);
}

// Todos los cobros asociados a un preapproval — es la consulta que
// confirma si de verdad hubo un pago aprobado (nunca se activa/mantiene
// Premium solo porque preapproval.status === "authorized", ver
// sincronizarSuscripcion en lib/suscripciones.ts y el comentario grande
// en lib/mercadopago-logica.ts).
export async function buscarPagosAutorizados(preapprovalId: string): Promise<{ results: PagoAutorizado[] }> {
  return mpFetch<{ results: PagoAutorizado[] }>(`/authorized_payments/search?preapproval_id=${encodeURIComponent(preapprovalId)}`);
}
