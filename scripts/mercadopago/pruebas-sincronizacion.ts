/**
 * Pruebas de la lógica de decisión de Mercado Pago Suscripciones —
 * corren en cualquier lado, sin credenciales ni conexión a Supabase ni a
 * Mercado Pago: todo lo que testean es lógica pura en
 * lib/mercadopago-logica.ts (nada de fetch, nada de DB).
 *
 * Corren con: npx tsx scripts/mercadopago/pruebas-sincronizacion.ts
 * (o: npm run test:mercadopago)
 *
 * Cubren los escenarios pedidos en la revisión de la integración —
 * incluido el bug real de producción de "preapproval authorized sin pago
 * aprobado": una Gratis puede pasar a Premium por Mercado Pago, un
 * Premium manual nunca se toca, un preapproval "authorized" NUNCA alcanza
 * por sí solo (siempre hace falta un pago realmente "approved"), y el
 * período ya pagado (`acceso_hasta`) solo avanza con un cobro aprobado —
 * nunca con uno rechazado/pendiente, y nunca por el status del
 * preapproval.
 */
import { createHmac } from "node:crypto";
import {
  calcularNuevaAutorizacion,
  esAccesoVigente,
  calcularFechaProximoPago,
  calcularAccesoHasta,
  pagoMasReciente,
  estadoPagoReal,
  detallePagoReal,
  esPagoAprobado,
  debeRevalidar,
  VENTANA_REVALIDACION_MS,
  VENTANA_REVALIDACION_PENDIENTE_MS,
  validarTokenWebhook,
  validarFirmaWebhook,
  normalizarEstadoPreapproval,
  esErrorStatusPreapprovalInvalido,
  debeMostrarGestionSuscripcion,
  puedeIniciarNuevaSuscripcion,
  resolverMontoCheckoutAlojado,
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

console.log("1. Gratis/manual + pago approved → Premium/mercadopago");
{
  const accesoHasta = calcularAccesoHasta({ pagoAprobado: true, nextPaymentDateNueva: FUTURO, accesoHastaExistente: null });
  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "gratis", origenNivel: "manual" },
    vigente: esAccesoVigente(accesoHasta, AHORA),
  });
  assert(decision.debeEscribir === true, "debeEscribir = true");
  assert(decision.debeEscribir && decision.nivel === "premium", "nivel objetivo = premium");
  assert(decision.debeEscribir && decision.origenNivel === "mercadopago", "origen objetivo = mercadopago");
}

console.log("\n2. Premium/manual + lo que sea (incluso sin ningún pago) → sigue Premium/manual (nunca se toca)");
{
  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "premium", origenNivel: "manual" },
    vigente: esAccesoVigente(null, AHORA),
  });
  assert(decision.debeEscribir === false, "no se escribe nada — protegido");
}

console.log("\n3. Premium/mercadopago + acceso_hasta futuro → sigue Premium (no-op, idempotente)");
{
  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "premium", origenNivel: "mercadopago" },
    vigente: esAccesoVigente(FUTURO, AHORA),
  });
  assert(decision.debeEscribir === false, "ya está en el estado objetivo, no reescribe");
}

console.log("\n4. Premium/mercadopago + preapproval canceled pero acceso_hasta futuro (ya pagado) → conserva Premium hasta esa fecha");
{
  const vigente = esAccesoVigente(FUTURO, AHORA);
  assert(vigente === true, "todavía tiene acceso vigente (no pasó acceso_hasta)");
  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "premium", origenNivel: "mercadopago" },
    vigente,
  });
  assert(decision.debeEscribir === false, "sigue Premium — no se baja de inmediato");
}

console.log("\n5. Premium/mercadopago + acceso_hasta ya pasado → Gratis");
{
  const vigente = esAccesoVigente(PASADO, AHORA);
  assert(vigente === false, "ya no tiene acceso vigente");
  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "premium", origenNivel: "mercadopago" },
    vigente,
  });
  assert(decision.debeEscribir === true, "debeEscribir = true");
  assert(decision.debeEscribir && decision.nivel === "gratis", "baja a gratis");
}

console.log("\n5b. Premium/mercadopago + acceso_hasta nunca registrado (null) → Gratis (no inventa fecha)");
{
  const vigente = esAccesoVigente(null, AHORA);
  assert(vigente === false, "sin fecha registrada, no hay período de gracia que inventar");
}

console.log("\n6. calcularAccesoHasta: defensivo ante pagos no aprobados y respuestas incompletas de Mercado Pago");
{
  const conservaSinPagoAprobado = calcularAccesoHasta({
    pagoAprobado: false,
    nextPaymentDateNueva: FUTURO,
    accesoHastaExistente: PASADO,
  });
  assert(conservaSinPagoAprobado === PASADO, "un pago no aprobado nunca extiende acceso_hasta, aunque next_payment_date venga con fecha nueva");

  const nuncaInventaSinExistente = calcularAccesoHasta({
    pagoAprobado: false,
    nextPaymentDateNueva: null,
    accesoHastaExistente: null,
  });
  assert(nuncaInventaSinExistente === null, "sin pago aprobado ni fecha existente, no inventa una");

  const avanzaConPagoAprobado = calcularAccesoHasta({
    pagoAprobado: true,
    nextPaymentDateNueva: FUTURO,
    accesoHastaExistente: PASADO,
  });
  assert(avanzaConPagoAprobado === FUTURO, "un pago aprobado sí avanza acceso_hasta a la nueva next_payment_date");

  const pagoAprobadoSinFechaNuevaConservaExistente = calcularAccesoHasta({
    pagoAprobado: true,
    nextPaymentDateNueva: null,
    accesoHastaExistente: PASADO,
  });
  assert(
    pagoAprobadoSinFechaNuevaConservaExistente === PASADO,
    "pago aprobado pero sin next_payment_date en la respuesta: conserva el existente, no inventa una fecha nueva"
  );
}

console.log("\n6b. calcularFechaProximoPago: informativo ('próximo cobro' en Perfil) — mismo criterio defensivo, ya no decide vigencia");
{
  const fecha = calcularFechaProximoPago({
    nextPaymentDateNueva: null,
    status: "canceled",
    fechaProximoPagoExistente: FUTURO,
  });
  assert(fecha === FUTURO, "conserva la fecha existente en vez de perderla si Mercado Pago no vuelve a mandarla tras cancelar/pausar");

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

console.log("\n12. debeRevalidar: ventana larga una vez que ya hay acceso_hasta guardado (resuelto, vigente o vencido)");
{
  const actualizadoEn = "2026-06-15T00:00:00Z";

  const justoAntes = Date.parse(actualizadoEn) + VENTANA_REVALIDACION_MS - 1;
  assert(debeRevalidar(actualizadoEn, "authorized", FUTURO, justoAntes) === false, "todavía dentro de la ventana → no revalida (no le pega a la API)");

  const justoDespues = Date.parse(actualizadoEn) + VENTANA_REVALIDACION_MS + 1;
  assert(debeRevalidar(actualizadoEn, "authorized", FUTURO, justoDespues) === true, "pasada la ventana → sí revalida");

  const muchoDespues = Date.parse(actualizadoEn) + VENTANA_REVALIDACION_MS * 10;
  assert(debeRevalidar(actualizadoEn, "canceled", PASADO, muchoDespues) === true, "mucho más viejo → sigue revalidando (no se \"cansa\")");
}

console.log("\n13. debeRevalidar: ventana corta mientras 'pending', o 'authorized' sin ningún pago aprobado todavía (acceso_hasta null)");
{
  const actualizadoEn = "2026-06-15T00:00:00Z";

  assert(VENTANA_REVALIDACION_PENDIENTE_MS < VENTANA_REVALIDACION_MS, "la ventana corta es más chica que la ventana estable");

  const dentroDeLaVentanaCorta = Date.parse(actualizadoEn) + VENTANA_REVALIDACION_PENDIENTE_MS - 1;
  assert(debeRevalidar(actualizadoEn, "pending", null, dentroDeLaVentanaCorta) === false, "'pending', todavía dentro de los 5 minutos → no revalida todavía");
  assert(
    debeRevalidar(actualizadoEn, "authorized", null, dentroDeLaVentanaCorta) === false,
    "'authorized' sin acceso_hasta (bug real: sin pago confirmado todavía), dentro de los 5 minutos → no revalida todavía"
  );

  const pasadaLaVentanaCorta = Date.parse(actualizadoEn) + VENTANA_REVALIDACION_PENDIENTE_MS + 1;
  assert(debeRevalidar(actualizadoEn, "pending", null, pasadaLaVentanaCorta) === true, "'pending', pasados los 5 minutos → sí revalida");
  assert(
    debeRevalidar(actualizadoEn, "authorized", null, pasadaLaVentanaCorta) === true,
    "'authorized' sin acceso_hasta, pasados los 5 minutos → sí revalida (justo el caso del bug real: hay que confirmar el cobro rápido)"
  );
  assert(
    debeRevalidar(actualizadoEn, "authorized", FUTURO, pasadaLaVentanaCorta) === false,
    "el mismo momento, pero ya con acceso_hasta confirmado → sigue fresca para la ventana larga"
  );
}

console.log(
  "\n14. Caso borde: Gratis/manual con una suscripción 'pending' guardada, nunca pasó por /membresia/resultado, Mercado Pago ya aprobó el pago → debe terminar en Premium/mercadopago"
);
{
  const actualizadoEnAlGuardarLaFilaPending = "2026-06-15T00:00:00Z";
  const ahoraSieteMinutosDespues = Date.parse(actualizadoEnAlGuardarLaFilaPending) + 7 * 60 * 1000;

  const correspondeRevalidar = debeRevalidar(actualizadoEnAlGuardarLaFilaPending, "pending", null, ahoraSieteMinutosDespues);
  assert(correspondeRevalidar === true, "pasados 7 minutos con estado 'pending' → sí corresponde volver a consultar a Mercado Pago");

  // Mercado Pago (simulado) ya aprobó el cobro.
  const accesoHasta = calcularAccesoHasta({ pagoAprobado: true, nextPaymentDateNueva: FUTURO, accesoHastaExistente: null });
  const vigente = esAccesoVigente(accesoHasta, ahoraSieteMinutosDespues);
  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "gratis", origenNivel: "manual" },
    vigente,
  });
  assert(decision.debeEscribir === true, "se corrige la autorización");
  assert(decision.debeEscribir && decision.nivel === "premium", "queda Premium");
  assert(decision.debeEscribir && decision.origenNivel === "mercadopago", "con origen mercadopago — sin haber pasado nunca por /membresia/resultado");
}

// ---------------------------------------------------------------------
// Bug real de producción: preapproval "authorized" ≠ pago aprobado.
// Los siguientes 5 escenarios son los pedidos explícitamente en la
// revisión que originó este archivo de pruebas.
// ---------------------------------------------------------------------

console.log("\n15. preapproval authorized + sin pago (todavía ninguna factura) → Gratis");
{
  const pagoReciente = pagoMasReciente([]); // /authorized_payments/search todavía sin resultados
  assert(pagoReciente === null, "sin ningún cobro encontrado todavía");
  assert(esPagoAprobado(pagoReciente) === false, "sin cobro, no hay pago aprobado");

  const accesoHasta = calcularAccesoHasta({ pagoAprobado: false, nextPaymentDateNueva: FUTURO, accesoHastaExistente: null });
  assert(accesoHasta === null, "acceso_hasta sigue null — nunca se inventa por más que next_payment_date venga con fecha");

  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "gratis", origenNivel: "manual" },
    vigente: esAccesoVigente(accesoHasta, AHORA),
  });
  // Sí se escribe (para dejar registrado que esta cuenta ya tiene un
  // preapproval de Mercado Pago asociado), pero el NIVEL se mantiene
  // gratis — el preapproval "authorized" solo nunca alcanza.
  assert(decision.debeEscribir === true, "se registra el origen mercadopago");
  assert(decision.debeEscribir && decision.nivel === "gratis", "sigue Gratis — el preapproval 'authorized' solo no alcanza");
}

console.log("\n16. preapproval authorized + pago rejected → Gratis");
{
  const pagoReciente = pagoMasReciente([
    { status: "rejected", paymentStatus: "rejected", paymentStatusDetail: "cc_rejected_high_risk", dateCreated: "2026-06-15T00:05:00Z" },
  ]);
  assert(estadoPagoReal(pagoReciente) === "rejected", "el cobro más reciente es 'rejected'");
  assert(detallePagoReal(pagoReciente) === "cc_rejected_high_risk", "se puede leer el detalle fino del rechazo, para loguearlo de forma segura");
  assert(esPagoAprobado(pagoReciente) === false, "rejected no es un pago aprobado");

  const accesoHasta = calcularAccesoHasta({ pagoAprobado: esPagoAprobado(pagoReciente), nextPaymentDateNueva: FUTURO, accesoHastaExistente: null });
  assert(accesoHasta === null, "un cobro rechazado nunca otorga acceso_hasta");

  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "gratis", origenNivel: "manual" },
    vigente: esAccesoVigente(accesoHasta, AHORA),
  });
  assert(decision.debeEscribir === true, "se registra el origen mercadopago");
  assert(decision.debeEscribir && decision.nivel === "gratis", "sigue Gratis — exactamente el bug real reportado en producción");
}

console.log("\n17. preapproval authorized + pago approved → Premium");
{
  const pagoReciente = pagoMasReciente([{ status: "approved", paymentStatus: "approved", dateCreated: "2026-06-15T00:05:00Z" }]);
  assert(esPagoAprobado(pagoReciente) === true, "el cobro más reciente está aprobado");

  const accesoHasta = calcularAccesoHasta({ pagoAprobado: true, nextPaymentDateNueva: FUTURO, accesoHastaExistente: null });
  assert(accesoHasta === FUTURO, "acceso_hasta avanza a la próxima fecha de cobro");

  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "gratis", origenNivel: "manual" },
    vigente: esAccesoVigente(accesoHasta, AHORA),
  });
  assert(decision.debeEscribir === true, "debeEscribir = true");
  assert(decision.debeEscribir && decision.nivel === "premium", "pasa a Premium — recién ahora que hay un pago aprobado de verdad");
}

console.log("\n18. Renovación rejected → NO extiende acceso_hasta (no debe cortar antes de tiempo, pero tampoco extender)");
{
  // La usuaria ya venía Premium con un período pagado hasta FUTURO. Llega
  // el intento de cobro de la renovación y Mercado Pago lo rechaza.
  const pagoReciente = pagoMasReciente([{ status: "rejected", paymentStatus: "rejected", dateCreated: "2026-07-01T00:00:00Z" }]);
  assert(esPagoAprobado(pagoReciente) === false, "la renovación fue rechazada");

  // Mercado Pago puede mandar un next_payment_date nuevo (fecha de
  // reintento) — no debe usarse para extender el acceso.
  const accesoHasta = calcularAccesoHasta({
    pagoAprobado: false,
    nextPaymentDateNueva: "2026-07-08T00:00:00Z", // reintento, no un período pagado
    accesoHastaExistente: FUTURO,
  });
  assert(accesoHasta === FUTURO, "acceso_hasta se mantiene en el período ya pagado, ignora la fecha de reintento");

  const decisionAntesDeVencer = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "premium", origenNivel: "mercadopago" },
    vigente: esAccesoVigente(accesoHasta, Date.parse("2026-06-20T00:00:00Z")),
  });
  assert(decisionAntesDeVencer.debeEscribir === false, "todavía dentro del período ya pagado → sigue Premium (no se corta de golpe)");

  const decisionDespuesDeVencer = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "premium", origenNivel: "mercadopago" },
    vigente: esAccesoVigente(accesoHasta, Date.parse("2026-07-02T00:00:00Z")),
  });
  assert(decisionDespuesDeVencer.debeEscribir === true, "pasado FUTURO sin haberse extendido → ahora sí baja a Gratis");
  assert(decisionDespuesDeVencer.debeEscribir && decisionDespuesDeVencer.nivel === "gratis", "baja a Gratis, la renovación rechazada nunca extendió el acceso");
}

console.log("\n19. Renovación approved → extiende acceso_hasta al nuevo período pagado");
{
  const pagoReciente = pagoMasReciente([{ status: "approved", paymentStatus: "approved", dateCreated: "2026-07-01T00:00:00Z" }]);
  assert(esPagoAprobado(pagoReciente) === true, "la renovación fue aprobada");

  const nuevoPeriodo = "2026-08-01T00:00:00Z";
  const accesoHasta = calcularAccesoHasta({
    pagoAprobado: true,
    nextPaymentDateNueva: nuevoPeriodo,
    accesoHastaExistente: FUTURO,
  });
  assert(accesoHasta === nuevoPeriodo, "acceso_hasta avanza al nuevo período pagado");

  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "premium", origenNivel: "mercadopago" },
    vigente: esAccesoVigente(accesoHasta, Date.parse("2026-07-15T00:00:00Z")),
  });
  assert(decision.debeEscribir === false, "sigue Premium (no-op, idempotente) con el acceso ya extendido");
}

// ---------------------------------------------------------------------
// Cancelación real de producción: PUT /preapproval/{id} respondió 400
// "Invalid preapproval status param: canceled" con el valor documentado.
// cancelarPreapproval() (lib/mercadopago.ts) hace el fetch real y no se
// puede testear acá sin red — pero las DOS piezas de lógica pura que
// deciden si corresponde reintentar y qué valor usar internamente sí.
// ---------------------------------------------------------------------

console.log('\n20. esErrorStatusPreapprovalInvalido: solo dispara el reintento ante ESE 400 puntual, nunca ante cualquier otro error');
{
  assert(
    esErrorStatusPreapprovalInvalido({ status: 400, mensajeMp: "Invalid preapproval status param: canceled" }, "canceled") === true,
    "400 + el mensaje exacto reportado en producción → sí reintentar"
  );
  assert(
    esErrorStatusPreapprovalInvalido({ status: 400, mensajeMp: "INVALID PREAPPROVAL STATUS PARAM: CANCELED" }, "canceled") === true,
    "mismo mensaje con mayúsculas distintas → sigue matcheando (no depender de mayúsculas/minúsculas)"
  );
  assert(
    esErrorStatusPreapprovalInvalido({ status: 400, mensajeMp: "Invalid preapproval status param: cancelled" }, "canceled") === false,
    "mensaje para OTRO valor intentado ('cancelled', no 'canceled') → no matchea, no hay que confundir cuál se estaba probando"
  );
  assert(
    esErrorStatusPreapprovalInvalido({ status: 400, mensajeMp: "card_token_id is required" }, "canceled") === false,
    "400 pero un mensaje totalmente distinto → nunca reintentar, sería ocultar un error real"
  );
  assert(
    esErrorStatusPreapprovalInvalido({ status: 401, mensajeMp: "Invalid preapproval status param: canceled" }, "canceled") === false,
    "el mismo mensaje pero con otro status HTTP (401, no 400) → no matchea"
  );
  assert(
    esErrorStatusPreapprovalInvalido({ status: 400, mensajeMp: null }, "canceled") === false,
    "sin mensaje de Mercado Pago (body no vino, o vino sin `message`) → no matchea, nunca se asume el motivo"
  );
}

console.log('\n21. normalizarEstadoPreapproval: "cancelled" (variante histórica) y "canceled" (documentado) se leen como un único estado interno');
{
  assert(normalizarEstadoPreapproval("cancelled") === "canceled", '"cancelled" (dos "l") se normaliza a "canceled"');
  assert(normalizarEstadoPreapproval("canceled") === "canceled", '"canceled" (el documentado) queda igual');
  assert(normalizarEstadoPreapproval("authorized") === "authorized", "cualquier otro estado real no se toca");
  assert(normalizarEstadoPreapproval("pending") === "pending", "cualquier otro estado real no se toca");
}

// ---------------------------------------------------------------------
// Último caso real: un preapproval "authorized" con el primer cobro
// rechazado deja a la usuaria en Gratis, pero Mercado Pago puede seguir
// reintentando ESE MISMO preapproval en segundo plano. Perfil solo
// mostraba la gestión/cancelación cuando nivel==="premium" — esa cuenta
// perdía la posibilidad de cancelarlo. Y sin este chequeo,
// iniciarSuscripcion() dejaba crear un segundo preapproval mientras el
// primero seguía activo (riesgo de dos cobros).
// ---------------------------------------------------------------------

console.log('\n22. Gratis + pago rejected + preapproval todavía "authorized" → debe poder cancelarlo desde Perfil');
{
  // Vigente=false porque nunca hubo un pago aprobado (acceso_hasta null,
  // ver escenario 16) — exactamente el estado real de esta cuenta.
  const debeMostrarse = debeMostrarGestionSuscripcion({ estado: "authorized", vigente: false });
  assert(debeMostrarse === true, "la gestión se muestra en Perfil aunque la usuaria sea Gratis");
  // Perfil solo oculta el botón de cancelar cuando estado === "canceled"
  // (ver app/(app)/perfil/page.tsx) — acá el preapproval sigue
  // "authorized", así que el botón de cancelar también se muestra.
}

console.log("\n23. Gratis + preapproval no cancelado → NO puede crear un segundo preapproval");
{
  assert(puedeIniciarNuevaSuscripcion("authorized") === false, "con un preapproval 'authorized' sin cancelar, no puede iniciar uno nuevo");
  assert(puedeIniciarNuevaSuscripcion("pending") === false, "tampoco mientras el anterior sigue 'pending'");
  assert(puedeIniciarNuevaSuscripcion("paused") === false, "tampoco mientras el anterior está 'paused'");
  assert(puedeIniciarNuevaSuscripcion("canceled") === true, "una vez cancelado el anterior, sí puede iniciar uno nuevo con otra tarjeta");
  assert(puedeIniciarNuevaSuscripcion(null) === true, "sin ningún preapproval previo, puede iniciar el primero sin restricciones");
}

console.log("\n24. debeMostrarGestionSuscripcion: sigue mostrando la gestión de un preapproval cancelado mientras dure el acceso de gracia ya pagado");
{
  assert(
    debeMostrarGestionSuscripcion({ estado: "canceled", vigente: true }) === true,
    "canceled con acceso todavía vigente (período ya pagado) → se sigue mostrando (aunque ahí no haya ya nada para cancelar)"
  );
  assert(
    debeMostrarGestionSuscripcion({ estado: "canceled", vigente: false }) === false,
    "canceled y sin ningún acceso vigente → ya no hay nada que gestionar/mostrar"
  );
}

// ---------------------------------------------------------------------
// Información antifraude (Device ID) y detalle fino del cobro
// (`payment.status_detail`, ej. "cc_rejected_high_risk") — no cambian en
// nada la regla de que Premium solo se activa con un pago realmente
// "approved"; son datos adicionales para mejorar la aprobación y para
// poder diagnosticar un rechazo sin loguear nada sensible.
// ---------------------------------------------------------------------

console.log('\n25. detallePagoReal: expone el motivo fino del cobro más reciente, sin tocar la decisión de aprobación');
{
  const pagoAprobado = pagoMasReciente([
    { status: "approved", paymentStatus: "approved", paymentStatusDetail: "accredited", dateCreated: "2026-06-15T00:05:00Z" },
  ]);
  assert(detallePagoReal(pagoAprobado) === "accredited", "pago aprobado → detalle 'accredited'");
  assert(esPagoAprobado(pagoAprobado) === true, "el detalle no cambia el criterio de aprobación: sigue siendo solo status === 'approved'");

  const sinDetalle = pagoMasReciente([{ status: "approved", paymentStatus: "approved", dateCreated: "2026-06-15T00:05:00Z" }]);
  assert(detallePagoReal(sinDetalle) === null, "si el recurso no expone status_detail, no se inventa ninguno");

  assert(detallePagoReal(null) === null, "sin ningún cobro encontrado, no hay detalle que mostrar");
}

console.log("\n26. Si falla la consulta a Mercado Pago, se conserva también el último ultimo_pago_detalle conocido (igual criterio que ultimo_pago_estado)");
{
  // Simula lo que hace sincronizarSuscripcion (lib/suscripciones.ts)
  // cuando buscarPagosAutorizados() falla: no hay ningún dato nuevo, así
  // que se usa el que ya estaba guardado en la fila existente en vez de
  // pisarlo con null.
  const detalleExistente = "cc_rejected_high_risk";
  const busquedaFallida = null; // buscarPagosAutorizados() lanzó y se atrapó
  const ultimoPagoDetalleResultante = busquedaFallida ? detallePagoReal(null) : detalleExistente;
  assert(ultimoPagoDetalleResultante === detalleExistente, "conserva el detalle ya guardado en vez de perderlo por un error transitorio de red");
}

// ---------------------------------------------------------------------
// Checkout alojado (prueba en paralelo, preapproval sin plan asociado +
// pending + init_point): NO se asume que el primer pago aparezca en
// /authorized_payments/search apenas la usuaria vuelve del checkout de
// Mercado Pago — la búsqueda puede devolver `[]` todavía un rato, aunque
// el preapproval ya haya cambiado de estado. El criterio es el mismo que
// ya usa el resto del archivo (pagoAprobado solo con un cobro
// "approved" encontrado), sin ninguna lógica nueva — este escenario
// verifica exactamente eso para el caso puntual que preocupa acá.
// ---------------------------------------------------------------------

console.log(
  '\n27. Checkout alojado: preapproval ya "authorized" pero /authorized_payments/search todavía devuelve [] → no inventa acceso, ni error: queda "confirmando"'
);
{
  const pagoReciente = pagoMasReciente([]); // la búsqueda ya respondió, pero sin resultados todavía
  assert(pagoReciente === null, "todavía no aparece ningún cobro, aunque el preapproval ya cambió de pending a authorized");
  assert(estadoPagoReal(pagoReciente) === null, "ultimo_pago_estado queda null — ni 'approved' ni 'rejected'");
  assert(esPagoAprobado(pagoReciente) === false, "sin cobro encontrado, no hay pago aprobado");

  const accesoHasta = calcularAccesoHasta({ pagoAprobado: false, nextPaymentDateNueva: FUTURO, accesoHastaExistente: null });
  assert(accesoHasta === null, "no se inventa acceso_hasta solo porque el preapproval esté 'authorized'");

  const decision = calcularNuevaAutorizacion({
    autorizacionActual: { nivel: "gratis", origenNivel: "manual" },
    vigente: esAccesoVigente(accesoHasta, AHORA),
  });
  assert(decision.debeEscribir === true, "se registra el origen mercadopago");
  assert(decision.debeEscribir && decision.nivel === "gratis", "sigue Gratis — nunca 'error': la UI cae en la rama de 'confirmando' (ver /membresia/resultado), no en la de 'rechazado'");
}

console.log("\n28. resolverMontoCheckoutAlojado: monto de prueba del checkout alojado, con fallback seguro a PREMIUM_PLAN.price");
{
  assert(
    resolverMontoCheckoutAlojado({ valorEnv: "10", precioDefault: 35000 }) === 10,
    "MERCADOPAGO_CHECKOUT_ALOJADO_BETA_AMOUNT=10 → usa 10, no el precio real"
  );
  assert(
    resolverMontoCheckoutAlojado({ valorEnv: undefined, precioDefault: 35000 }) === 35000,
    "sin la variable configurada → usa PREMIUM_PLAN.price como fallback"
  );
  assert(
    resolverMontoCheckoutAlojado({ valorEnv: null, precioDefault: 35000 }) === 35000,
    "variable vacía/null → mismo fallback"
  );
  assert(
    resolverMontoCheckoutAlojado({ valorEnv: "0", precioDefault: 35000 }) === 35000,
    "0 no es un monto de prueba válido → fallback, nunca se manda un monto en cero a Mercado Pago"
  );
  assert(
    resolverMontoCheckoutAlojado({ valorEnv: "-5", precioDefault: 35000 }) === 35000,
    "negativo tampoco es válido → fallback"
  );
  assert(
    resolverMontoCheckoutAlojado({ valorEnv: "no-es-un-numero", precioDefault: 35000 }) === 35000,
    "un valor no numérico (typo en la variable) → fallback, nunca rompe la creación del preapproval"
  );
}

console.log(fallos === 0 ? "\n✅ Todas las pruebas pasaron." : `\n❌ ${fallos} prueba(s) fallaron.`);
process.exit(fallos === 0 ? 0 : 1);
