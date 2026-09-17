import "server-only";
import { PREMIUM_PLAN } from "@/lib/config/premium";
import type { EstadoPreapproval } from "@/lib/mercadopago-logica";

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

// Estado real de Mercado Pago: "canceled" (una sola "l"). Ver el
// comentario en lib/mercadopago-logica.ts.
export async function cancelarPreapproval(id: string): Promise<Preapproval> {
  return mpFetch<Preapproval>(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "canceled" }),
  });
}

export async function obtenerAuthorizedPayment(id: string | number): Promise<AuthorizedPayment> {
  return mpFetch<AuthorizedPayment>(`/authorized_payments/${encodeURIComponent(String(id))}`);
}
