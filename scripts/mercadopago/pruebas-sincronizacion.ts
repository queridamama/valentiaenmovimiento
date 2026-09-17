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
  debeRevalidar,
  VENTANA_REVALIDACION_MS,
  VENTANA_REVALIDACION_PENDIENTE_MS,
  validarTokenWebhook,
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

console.log("\n8. validarTokenWebhook: producción sin MERCADOPAGO_WEBHOOK_TOKEN configurado → rechazado (SÍ es fail-closed: es un secreto propio, siempre obtenible)");
{
  const original = process.env.MERCADOPAGO_WEBHOOK_TOKEN;
  delete process.env.MERCADOPAGO_WEBHOOK_TOKEN;

  const rechazadoEnProduccion = validarTokenWebhook({ tokenRecibido: null, esProduccion: true });
  assert(rechazadoEnProduccion === false, "producción sin token → false (fail-closed)");

  const permitidoEnDev = validarTokenWebhook({ tokenRecibido: null, esProduccion: false });
  assert(permitidoEnDev === true, "desarrollo sin token → true (fail-open controlado, solo para setup local)");

  if (original) process.env.MERCADOPAGO_WEBHOOK_TOKEN = original;
}

console.log("\n9. validarTokenWebhook: con token configurado, el correcto pasa y cualquier otro se rechaza");
{
  process.env.MERCADOPAGO_WEBHOOK_TOKEN = "token-de-prueba-bien-largo";

  const correcto = validarTokenWebhook({ tokenRecibido: "token-de-prueba-bien-largo", esProduccion: true });
  assert(correcto === true, "token correcto → true");

  const incorrecto = validarTokenWebhook({ tokenRecibido: "cualquier-otra-cosa", esProduccion: true });
  assert(incorrecto === false, "token incorrecto → false");

  const faltante = validarTokenWebhook({ tokenRecibido: null, esProduccion: true });
  assert(faltante === false, "sin token en la request (configurado el esperado) → false");

  delete process.env.MERCADOPAGO_WEBHOOK_TOKEN;
}

console.log("\n10. validarFirmaWebhook: best-effort — nunca rechaza solo porque falte el header (no hay garantía de que Mercado Pago lo mande para una app de tipo Suscripciones)");
{
  const original = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const sinSecretoNiHeader = validarFirmaWebhook({ xSignature: null, xRequestId: null, dataId: "123" });
  assert(sinSecretoNiHeader === true, "sin secreto configurado → true (nada que validar)");

  process.env.MERCADOPAGO_WEBHOOK_SECRET = "secreto-de-prueba";
  const conSecretoSinHeader = validarFirmaWebhook({ xSignature: null, xRequestId: null, dataId: "123" });
  assert(conSecretoSinHeader === true, "secreto configurado pero Mercado Pago no mandó x-signature → true (no es sospechoso para este tipo de app)");

  if (original) process.env.MERCADOPAGO_WEBHOOK_SECRET = original;
  else delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
}

console.log("\n11. validarFirmaWebhook: con secreto Y header presentes, firma correcta pasa y firma incorrecta (manipulada) se rechaza");
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
  });
  assert(valida === true, "firma correcta → true");

  const invalida = validarFirmaWebhook({
    xSignature: `ts=${ts},v1=${"0".repeat(firmaCorrecta.length)}`,
    xRequestId: "req-1",
    dataId,
  });
  assert(invalida === false, "firma incorrecta (header presente pero no matchea) → false");

  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
}

console.log("\n12. debeRevalidar: ventana larga para suscripciones ya resueltas (authorized/paused/canceled)");
{
  const actualizadoEn = "2026-06-15T00:00:00Z";

  const justoAntes = Date.parse(actualizadoEn) + VENTANA_REVALIDACION_MS - 1;
  assert(debeRevalidar(actualizadoEn, "authorized", justoAntes) === false, "todavía dentro de la ventana → no revalida (no le pega a la API)");

  const justoDespues = Date.parse(actualizadoEn) + VENTANA_REVALIDACION_MS + 1;
  assert(debeRevalidar(actualizadoEn, "authorized", justoDespues) === true, "pasada la ventana → sí revalida");

  const muchoDespues = Date.parse(actualizadoEn) + VENTANA_REVALIDACION_MS * 10;
  assert(debeRevalidar(actualizadoEn, "canceled", muchoDespues) === true, "mucho más viejo → sigue revalidando (no se \"cansa\")");
}

console.log("\n13. debeRevalidar: ventana corta y propia para suscripciones todavía 'pending'");
{
  const actualizadoEn = "2026-06-15T00:00:00Z";

  assert(VENTANA_REVALIDACION_PENDIENTE_MS < VENTANA_REVALIDACION_MS, "la ventana 'pending' es más chica que la ventana estable");

  const dentroDeLaVentanaPendiente = Date.parse(actualizadoEn) + VENTANA_REVALIDACION_PENDIENTE_MS - 1;
  assert(debeRevalidar(actualizadoEn, "pending", dentroDeLaVentanaPendiente) === false, "todavía dentro de los 5 minutos → no revalida todavía");

  // El mismo momento que sería "todavía fresco" para una suscripción ya
  // resuelta (authorized) ya es "vieja" para una que sigue pending — es
  // justo la diferencia que se busca: enterarse rápido de que Mercado
  // Pago ya la autorizó, sin esperar la ventana larga.
  const pasadaLaVentanaPendienteNoLaEstable = Date.parse(actualizadoEn) + VENTANA_REVALIDACION_PENDIENTE_MS + 1;
  assert(debeRevalidar(actualizadoEn, "pending", pasadaLaVentanaPendienteNoLaEstable) === true, "pasados los 5 minutos, todavía pending → sí revalida");
  assert(
    debeRevalidar(actualizadoEn, "authorized", pasadaLaVentanaPendienteNoLaEstable) === false,
    "el mismo momento, pero ya authorized → sigue fresca para la ventana larga"
  );
}

console.log(
  "\n14. Caso borde: Gratis/manual con una suscripción 'pending' guardada, nunca pasó por /membresia/resultado, Mercado Pago ya confirmó authorized → debe terminar en Premium/mercadopago"
);
{
  // Reproduce exactamente el escenario reportado: se guardó la fila en
  // `suscripciones` al iniciar la compra (estado='pending', proveedor=
  // 'mercadopago'), pero la autorización de la cuenta sigue en su
  // default de siempre (gratis/manual) porque la usuaria cerró Mercado
  // Pago, perdió conexión, o nunca volvió a /membresia/resultado. La
  // revalidación perezosa (revalidarSiCorresponde, en lib/suscripciones.ts)
  // es la que tiene que encontrar esta fila y, si ya pasó su ventana
  // corta de 'pending', volver a consultar — acá se simula que esa
  // consulta ya devolvió "authorized" y se verifica el resultado final.
  const actualizadoEnAlGuardarLaFilaPending = "2026-06-15T00:00:00Z";
  const ahoraSieteMinutosDespues = Date.parse(actualizadoEnAlGuardarLaFilaPending) + 7 * 60 * 1000;

  const correspondeRevalidar = debeRevalidar(actualizadoEnAlGuardarLaFilaPending, "pending", ahoraSieteMinutosDespues);
  assert(correspondeRevalidar === true, "pasados 7 minutos con estado 'pending' → sí corresponde volver a consultar a Mercado Pago");

  // Mercado Pago (simulado) ya confirmó la suscripción.
  const vigente = esAccesoVigente("authorized", null, ahoraSieteMinutosDespues);
  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "gratis", origenNivel: "manual" },
    vigente,
  });
  assert(decision.debeEscribir === true, "se corrige la autorización");
  assert(decision.debeEscribir && decision.nivel === "premium", "queda Premium");
  assert(decision.debeEscribir && decision.origenNivel === "mercadopago", "con origen mercadopago — sin haber pasado nunca por /membresia/resultado");
}

console.log(fallos === 0 ? "\n✅ Todas las pruebas pasaron." : `\n❌ ${fallos} prueba(s) fallaron.`);
process.exit(fallos === 0 ? 0 : 1);
