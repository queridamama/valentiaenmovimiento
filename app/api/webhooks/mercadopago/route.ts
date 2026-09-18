import { NextRequest, NextResponse } from "next/server";
import { obtenerPreapproval, obtenerAuthorizedPayment, validarTokenWebhook, validarFirmaWebhook } from "@/lib/mercadopago";
import { sincronizarSuscripcion } from "@/lib/suscripciones";

// Endpoint OPCIONAL, no una dependencia: la activación/mantenimiento/
// cancelación de Premium se resuelven por polling server-side directo
// contra GET /preapproval/{id} (ver lib/suscripciones.ts:
// revalidarSuscripcionAhora se llama al volver del checkout en
// /membresia/resultado, y revalidarSiCorresponde en cada lectura de
// autorización, con una ventana de 6hs — lib/mercadopago-logica.ts).
//
// Por qué no depende de esto: `crearPreapproval()` (lib/mercadopago.ts)
// NO manda `notification_url` — ese campo no está confirmado en la
// referencia oficial de POST /preapproval (los SDK oficiales de Go y
// PHP no lo declaran en su tipo de request), así que no hay forma
// verificada de decirle a Mercado Pago dónde mandar las notificaciones
// sin inventar un campo no documentado. Sumado a que la app de Mercado
// Pago de Valentía es de tipo "Suscripciones" y ese tipo de app no
// muestra "Tus integraciones → Webhooks" para configurarlo a mano, este
// endpoint queda escrito y listo pero sin nada que lo alimente por
// ahora — se conserva por si el día de mañana se confirma una forma
// oficial de registrar la URL (manual, en algún panel de la propia
// aplicación, o un campo nuevo que Mercado Pago termine documentando).
//
// SEGURIDAD, si alguna vez llega a recibir tráfico real: la URL que se
// registre debe incluir un token propio como query param —
//   https://<tu-dominio>/api/webhooks/mercadopago?token=<MERCADOPAGO_WEBHOOK_TOKEN>
// — enteramente nuestro, así que SÍ se exige en producción
// (validarTokenWebhook). Si además Mercado Pago manda x-signature, se
// valida como capa extra (validarFirmaWebhook), pero nunca es la única
// defensa: NUNCA se confía en el body de la notificación para dar
// Premium — se vuelve a consultar el recurso real a la API con el
// ACCESS TOKEN antes de escribir nada (lib/suscripciones.ts), exacta-
// mente la misma regla que usa el polling.
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
      // Solo se usa esta consulta para encontrar a qué preapproval
      // pertenece el pago — sincronizarSuscripcion vuelve a preguntar por
      // su cuenta el cobro real (buscarPagosAutorizados) antes de decidir
      // nada, nunca se confía en el status de esta notificación puntual.
      const pago = await obtenerAuthorizedPayment(dataId);
      const preapproval = await obtenerPreapproval(pago.preapproval_id);
      await sincronizarSuscripcion(preapproval);
    }
    // "payment": la documentación general de Mercado Pago para
    // Suscripciones menciona activar también este tópico — no se
    // asume que sea seguro ignorarlo por eso solo, se deja explícito
    // qué cubrimos sin él. Este endpoint no es siquiera la vía
    // principal (ver el comentario de arriba: la fuente de verdad es
    // el polling directo a GET /preapproval/{id}), y `sincronizarSuscripcion`
    // ya hace su propia consulta a GET /authorized_payments/search para
    // confirmar el cobro real (nunca se activa Premium solo por el status
    // del preapproval) — no depende de ningún evento de Pagos para eso.
    // Si de todos modos llega una notificación de tipo "payment" acá, no
    // entra en ningún `if` de arriba y se responde 200 sin hacer nada —
    // recibirla y descartarla a propósito es más seguro que no tenerla
    // contemplada.
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
