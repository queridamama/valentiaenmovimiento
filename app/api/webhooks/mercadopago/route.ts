import { NextRequest, NextResponse } from "next/server";
import { obtenerPreapproval, obtenerAuthorizedPayment, validarTokenWebhook, validarFirmaWebhook } from "@/lib/mercadopago";
import { sincronizarSuscripcion } from "@/lib/suscripciones";

// Endpoint a registrar en Mercado Pago para los tópicos de Suscripciones
// (subscription_preapproval, subscription_authorized_payment).
//
// IMPORTANTE sobre cómo se registra esta URL: la app de Mercado Pago de
// Valentía se creó como "Suscripciones", y para ese tipo de aplicación
// Mercado Pago NO muestra la sección de Webhooks dentro de "Tus
// integraciones" (confirmado contra la cuenta real y la documentación
// vigente) — ese es el panel donde normalmente se generaría la "Firma
// secreta" para validar x-signature. Sin ese panel, no hay Firma secreta
// que exigir.
//
// Por eso la URL que hay que darle a Mercado Pago (donde sea que la app
// de tipo Suscripciones permita cargarla — buscar algo como "URL de
// notificaciones"/"Webhooks" dentro de la propia aplicación, no
// necesariamente bajo "Tus integraciones") tiene que incluir un token
// propio como query param:
//
//   https://<tu-dominio>/api/webhooks/mercadopago?token=<MERCADOPAGO_WEBHOOK_TOKEN>
//
// Ese token es enteramente nuestro (lo elegimos, lo guardamos en la
// variable de entorno, lo pegamos en la URL) — no depende de ningún
// panel de Mercado Pago, así que SÍ se exige en producción (ver
// validarTokenWebhook). Si además Mercado Pago llega a mandar
// x-signature para este tipo de app, se valida como capa extra
// (validarFirmaWebhook), pero nunca es la única defensa.
//
// La defensa que de verdad importa, con o sin token/firma: NUNCA se
// confía en el body de la notificación para dar Premium. Ante cualquier
// evento válido, se vuelve a consultar el recurso real a la API de
// Mercado Pago con el ACCESS TOKEN, y solo esa respuesta autenticada
// puede terminar escribiendo algo en Supabase (ver lib/suscripciones.ts).
//
// Respuestas:
//   - token/firma inválidos → 401, no se procesa nada.
//   - evento irrelevante/sin recurso → 200, no hay nada que hacer.
//   - evento procesado correctamente → 200.
//   - error consultando Mercado Pago o escribiendo en Supabase → 500,
//     A PROPÓSITO: Mercado Pago reintenta una notificación que no
//     devuelve 200, y eso es justo lo que se quiere acá — un problema
//     transitorio (red, rate limit, DB caída un segundo) no debe perder
//     el evento en silencio. `sincronizarSuscripcion` es idempotente
//     (upsert por usuario_id+proveedor), así que un reintento nunca
//     duplica nada, solo repite el mismo resultado.
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

  if (!validarTokenWebhook({ tokenRecibido: url.searchParams.get("token") })) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
  if (!validarFirmaWebhook({ xSignature, xRequestId, dataId: dataId || null })) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  if (!tipo || !dataId) {
    // Notificación de prueba / ping sin recurso real — nada que hacer.
    return NextResponse.json({ ok: true });
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
    // poder investigar manualmente cuál notificación falló. 500 en vez
    // de 200: un error acá es transitorio (Mercado Pago caído, Supabase
    // caído) y merece que Mercado Pago reintente, no que el evento se
    // pierda.
    console.error("[webhook mercadopago] error procesando", tipo, dataId, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Error procesando la notificación" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Mercado Pago valida la URL del webhook con un GET simple al
// registrarla — sin esto, la validación falla y no se puede guardar la
// configuración. No exige el token acá: es solo el chequeo de "esta URL
// responde", no una notificación real.
export async function GET() {
  return NextResponse.json({ ok: true });
}
