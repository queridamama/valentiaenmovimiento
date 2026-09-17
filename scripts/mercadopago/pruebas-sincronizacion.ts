/**
 * Pruebas de la lógica de decisión de Mercado Pago Suscripciones —
 * corren en cualquier lado, sin credenciales ni conexión a Supabase ni a
 * Mercado Pago: todo lo que testean es lógica pura en
 * lib/mercadopago-logica.ts (nada de fetch, nada de DB).
 *
 * Corren con: npx tsx scripts/mercadopago/pruebas-sincronizacion.ts
 * (o: npm run test:mercadopago)
 *
 * Cubren exactamente los escenarios pedidos en la revisión de la
 * integración: una Gratis puede pasar a Premium por Mercado Pago, un
 * Premium manual nunca se toca, y el período ya pagado se conserva al
 * cancelar/pausar.
 */
import { createHmac } from "node:crypto";
import {
  calcularNuevaAutorizacion,
  esAccesoVigente,
  calcularFechaProximoPago,
  validarFirmaWebhook,
} from "../../lib/mercadopago-logica";

let fallos = 0;
function assert(condicion: boolean, mensaje: string) {
  if (condicion) {
    console.log(`  ✅ ${mensaje}`);
  } else {
    console.error(`  ❌ ${mensaje}`);
    fallos++;
  }
}

const AHORA = Date.parse("2026-06-15T00:00:00Z");
const FUTURO = "2026-07-01T00:00:00Z"; // después de AHORA
const PASADO = "2026-06-01T00:00:00Z"; // antes de AHORA

console.log("1. Gratis/manual + authorized → Premium/mercadopago");
{
  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "gratis", origenNivel: "manual" },
    vigente: esAccesoVigente("authorized", null, AHORA),
  });
  assert(decision.debeEscribir === true, "debeEscribir = true");
  assert(decision.debeEscribir && decision.nivel === "premium", "nivel objetivo = premium");
  assert(decision.debeEscribir && decision.origenNivel === "mercadopago", "origen objetivo = mercadopago");
}

console.log("\n2. Premium/manual + webhook canceled → sigue Premium/manual (nunca se toca)");
{
  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "premium", origenNivel: "manual" },
    vigente: esAccesoVigente("canceled", null, AHORA),
  });
  assert(decision.debeEscribir === false, "no se escribe nada — protegido");
}

console.log("\n3. Premium/mercadopago + authorized → sigue Premium (no-op, idempotente)");
{
  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "premium", origenNivel: "mercadopago" },
    vigente: esAccesoVigente("authorized", null, AHORA),
  });
  assert(decision.debeEscribir === false, "ya está en el estado objetivo, no reescribe");
}

console.log("\n4. Premium/mercadopago + canceled con fecha futura pagada → conserva Premium hasta esa fecha");
{
  const vigente = esAccesoVigente("canceled", FUTURO, AHORA);
  assert(vigente === true, "todavía tiene acceso vigente (no pasó fecha_proximo_pago)");
  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "premium", origenNivel: "mercadopago" },
    vigente,
  });
  assert(decision.debeEscribir === false, "sigue Premium — no se baja de inmediato");
}

console.log("\n5. Premium/mercadopago + canceled sin acceso vigente (fecha ya pasada) → Gratis");
{
  const vigente = esAccesoVigente("canceled", PASADO, AHORA);
  assert(vigente === false, "ya no tiene acceso vigente");
  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "premium", origenNivel: "mercadopago" },
    vigente,
  });
  assert(decision.debeEscribir === true, "debeEscribir = true");
  assert(decision.debeEscribir && decision.nivel === "gratis", "baja a gratis");
}

console.log("\n5b. Premium/mercadopago + canceled sin fecha_proximo_pago nunca registrada → Gratis (no inventa fecha)");
{
  const vigente = esAccesoVigente("canceled", null, AHORA);
  assert(vigente === false, "sin fecha registrada, no hay período de gracia que inventar");
}

console.log("\n6. Cancelación defensiva: si Mercado Pago no vuelve a mandar next_payment_date tras cancelar, se conserva el que ya teníamos");
{
  const fecha = calcularFechaProximoPago({
    nextPaymentDateNueva: null,
    status: "canceled",
    fechaProximoPagoExistente: FUTURO,
  });
  assert(fecha === FUTURO, "conserva la fecha existente en vez de perderla");

  const fechaNuncaExistio = calcularFechaProximoPago({
    nextPaymentDateNueva: null,
    status: "canceled",
    fechaProximoPagoExistente: null,
  });
  assert(fechaNuncaExistio === null, "si nunca hubo fecha, no inventa una");

  const fechaSeActualiza = calcularFechaProximoPago({
    nextPaymentDateNueva: FUTURO,
    status: "authorized",
    fechaProximoPagoExistente: PASADO,
  });
  assert(fechaSeActualiza === FUTURO, "si Mercado Pago sí manda una fecha nueva, se usa esa (no la vieja)");
}

console.log("\n7. Webhook duplicado → idempotente (aplicar la misma notificación dos veces no cambia nada la segunda vez)");
{
  // Primera vez: gratis/manual pasa a premium/mercadopago.
  const primera = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "gratis", origenNivel: "manual" },
    vigente: true,
  });
  assert(primera.debeEscribir === true, "primera notificación: escribe premium/mercadopago");

  // Segunda vez (reintento/duplicado): la autorización YA está en el
  // estado que dejó la primera — no debe volver a escribir.
  const segunda = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "premium", origenNivel: "mercadopago" },
    vigente: true,
  });
  assert(segunda.debeEscribir === false, "segunda notificación (duplicada): no-op");
}

console.log("\n8. validarFirmaWebhook: producción sin secreto configurado → rechazado");
{
  const original = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;

  const rechazadoEnProduccion = validarFirmaWebhook({
    xSignature: null,
    xRequestId: null,
    dataId: "123",
    esProduccion: true,
  });
  assert(rechazadoEnProduccion === false, "producción sin secreto → false (fail-closed)");

  const permitidoEnDev = validarFirmaWebhook({
    xSignature: null,
    xRequestId: null,
    dataId: "123",
    esProduccion: false,
  });
  assert(permitidoEnDev === true, "desarrollo sin secreto → true (fail-open controlado, solo para setup local)");

  if (original) process.env.MERCADOPAGO_WEBHOOK_SECRET = original;
}

console.log("\n9. validarFirmaWebhook: con secreto configurado, firma correcta pasa y firma incorrecta se rechaza");
{
  process.env.MERCADOPAGO_WEBHOOK_SECRET = "secreto-de-prueba";
  const dataId = "abc123";
  const ts = "1700000000";
  const manifest = `id:${dataId.toLowerCase()};request-id:req-1;ts:${ts};`;
  const firmaCorrecta = createHmac("sha256", "secreto-de-prueba").update(manifest).digest("hex");

  const valida = validarFirmaWebhook({
    xSignature: `ts=${ts},v1=${firmaCorrecta}`,
    xRequestId: "req-1",
    dataId,
    esProduccion: true,
  });
  assert(valida === true, "firma correcta → true");

  const invalida = validarFirmaWebhook({
    xSignature: `ts=${ts},v1=${"0".repeat(firmaCorrecta.length)}`,
    xRequestId: "req-1",
    dataId,
    esProduccion: true,
  });
  assert(invalida === false, "firma incorrecta → false");

  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
}

console.log(fallos === 0 ? "\n✅ Todas las pruebas pasaron." : `\n❌ ${fallos} prueba(s) fallaron.`);
process.exit(fallos === 0 ? 0 : 1);
