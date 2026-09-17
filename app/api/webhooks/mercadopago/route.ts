import { NextRequest, NextResponse } from "next/server";
import { obtenerPreapproval, obtenerAuthorizedPayment, validarFirmaWebhook } from "@/lib/mercadopago";
import { sincronizarSuscripcion } from "@/lib/suscripciones";

// Endpoint que hay que registrar en Mercado Pago (Tus integraciones →
// Webhooks) para los tópicos "Suscripciones" (subscription_preapproval,
// subscription_authorized_payment). No confía en nada del body salvo el
// tipo de evento y el id del recurso: el estado real siempre se vuelve a
// consultar server-side con el ACCESS TOKEN (ver lib/mercadopago.ts).
//
// Responde 200 rápido y sin bloquear en casi todos los casos — incluso
// si algo salió mal procesando, para no generar una tormenta de
// reintentos por un problema que un reintento automático no va a
// resolver (ver comentario abajo). La única respuesta distinta de 200 es
// 401 por firma inválida.
export async function POST(req: NextRequest) {
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  const url = new URL(req.url);

  let body: { type?: string; action?: string; data?: { id?: string | number } } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  // Mercado Pago manda el tipo/id tanto en el body (formato nuevo) como,
  // históricamente, en query params (?topic=&id=) — se acepta cualquiera
  // de los dos para no depender de cuál esté vigente.
  const tipo = body?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = String(body?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");

  if (!tipo || !dataId) {
    // Notificación de prueba / ping sin recurso real — nada que hacer.
    return NextResponse.json({ ok: true });
  }

  if (!validarFirmaWebhook({ xSignature, xRequestId, dataId })) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  try {
    if (tipo === "subscription_preapproval" || tipo === "preapproval") {
      const preapproval = await obtenerPreapproval(dataId);
      await sincronizarSuscripcion(preapproval);
    } else if (tipo === "subscription_authorized_payment") {
      const pago = await obtenerAuthorizedPayment(dataId);
      const preapproval = await obtenerPreapproval(pago.preapproval_id);
      await sincronizarSuscripcion(preapproval, { fechaUltimoPago: pago.date_created });
    }
    // "payment" (pagos sueltos, Checkout Pro/API) no aplica a
    // Suscripciones — se ignora sin error.
  } catch (err) {
    // No se loguea el body completo (podría traer payer_email u otros
    // datos de la persona) ni el access token — solo lo mínimo para
    // poder investigar manualmente cuál notificación falló.
    console.error("[webhook mercadopago] error procesando", tipo, dataId, err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true });
}

// Mercado Pago valida la URL del webhook con un GET simple al
// registrarla — sin esto, la validación falla y no se puede guardar la
// configuración.
export async function GET() {
  return NextResponse.json({ ok: true });
}
