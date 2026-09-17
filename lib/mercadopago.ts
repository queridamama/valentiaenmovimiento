import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PREMIUM_PLAN } from "@/lib/config/premium";

// Todo esto habla con la API REST de Mercado Pago directo por fetch — no
// hace falta el SDK oficial para dos endpoints (preapproval,
// preapproval_plan). El ACCESS TOKEN nunca sale de este archivo/del
// servidor: todas las funciones son server-only y ninguna se expone como
// Server Action (no llevan "use server"), se llaman desde código de
// servidor (route handlers, server actions, Server Components).
//
// LÍMITE CONOCIDO — leer antes de tocar la lógica de cancelación: este
// entorno no tiene acceso de red a mercadopago.com (política de egress
// del sandbox), así que no pude verificar contra la documentación en
// vivo el nombre/comportamiento exacto de `next_payment_date` en el
// recurso Preapproval al cancelar una suscripción. Se asume (de la
// documentación histórica de Mercado Pago) que es la fecha del próximo
// cobro programado, y se usa como "pagado hasta" para no cortar acceso a
// mitad de ciclo (ver obtenerNivelDesdeSuscripcion en
// lib/acciones/membresia.ts). Antes de confiar en esto en producción:
// pegarle a GET /preapproval/:id con una suscripción real y confirmar
// que el campo existe y se comporta como se espera.

const API_BASE = "https://api.mercadopago.com";

function accessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Falta configurar MERCADOPAGO_ACCESS_TOKEN.");
  return token;
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
    // Nunca se loguea el access token ni el body completo si trae datos
    // de pago — solo el status y el mensaje de error que devuelve MP.
    throw new Error(`Mercado Pago ${path} respondió ${res.status}: ${cuerpo?.message ?? "sin detalle"}`);
  }
  return cuerpo as T;
}

export type EstadoPreapproval = "pending" | "authorized" | "paused" | "cancelled";

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

export interface AuthorizedPayment {
  id: number | string;
  preapproval_id: string;
  status: string;
  transaction_amount: number;
  date_created?: string;
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
// el que devuelve una consulta autenticada server-side a la API de MP
// (ver /api/webhooks/mercadopago). Eso es lo que evita que alguien active
// Premium propio mandando un external_reference ajeno.
export async function crearPreapproval(params: {
  payerEmail: string;
  externalReference: string;
  backUrl: string;
}): Promise<Preapproval> {
  return mpFetch<Preapproval>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      preapproval_plan_id: planId(),
      reason: PREMIUM_PLAN.reason,
      external_reference: params.externalReference,
      payer_email: params.payerEmail,
      back_url: params.backUrl,
      status: "pending",
    }),
  });
}

export async function obtenerPreapproval(id: string): Promise<Preapproval> {
  return mpFetch<Preapproval>(`/preapproval/${encodeURIComponent(id)}`);
}

export async function cancelarPreapproval(id: string): Promise<Preapproval> {
  return mpFetch<Preapproval>(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

export async function obtenerAuthorizedPayment(id: string | number): Promise<AuthorizedPayment> {
  return mpFetch<AuthorizedPayment>(`/authorized_payments/${encodeURIComponent(String(id))}`);
}

// ---------- Validación del webhook (x-signature) ----------
// Mercado Pago firma cada notificación con HMAC-SHA256 sobre un
// "manifest" armado con el id del recurso, el x-request-id y el
// timestamp, usando el secreto configurado en la app de Mercado Pago
// (Tus integraciones → Webhooks → "Firma secreta"). Formato del
// manifest documentado por MP: "id:{data.id};request-id:{x-request-id};
// ts:{ts};" — ver LÍMITE CONOCIDO al inicio de este archivo: no pude
// confirmar esto contra la documentación en vivo desde este entorno
// (sin acceso de red a mercadopago.com). Si Mercado Pago cambia el
// formato, esta es la única función a ajustar.
//
// Si no hay MERCADOPAGO_WEBHOOK_SECRET configurado todavía (setup
// inicial), esta función no rechaza la notificación — pero el llamador
// (route.ts) igual solo actúa sobre el estado que vuelve a consultar
// server-side a la API de MP, nunca sobre el body de la notificación en
// sí, así que la superficie de riesgo real de no tener el secreto
// configurado es baja (alguien podría hacer que reconsultemos un id de
// suscripción real de más, pero nunca activar Premium con datos falsos).
export function validarFirmaWebhook(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secreto) return true;
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
