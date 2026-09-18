import "server-only";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { obtenerPreapproval, buscarPagosAutorizados, type Preapproval, type EstadoPreapproval } from "@/lib/mercadopago";
import {
  calcularFechaProximoPago,
  calcularAccesoHasta,
  esAccesoVigente,
  calcularNuevaAutorizacion,
  debeRevalidar,
  pagoMasReciente,
  estadoPagoReal,
  detallePagoReal,
  esPagoAprobado,
} from "@/lib/mercadopago-logica";

export interface ResultadoSincronizacion {
  nivel: "gratis" | "premium";
  ultimoPagoEstado: string | null;
  accesoHasta: string | null;
}

// Único punto de escritura para el estado real de una suscripción de
// Mercado Pago. La llaman: iniciarSuscripcion/cancelarSuscripcion (Server
// Actions de Perfil/Membresía), la revalidación server-side por polling
// (revalidarSuscripcionAhora/revalidarSiCorresponde, más abajo — el
// mecanismo principal, ya que la activación/mantenimiento/cancelación de
// Premium NO dependen de que llegue ningún webhook) y, si algún día se
// confirma una forma oficial de registrarlo, el webhook opcional en
// /api/webhooks/mercadopago. Idempotente (upsert por usuario_id+proveedor)
// y nunca pisa un Premium otorgado a mano (nivel=premium +
// origen_nivel='manual') — esa es la protección contra que la
// sincronización le baje el nivel a una cortesía o alumna histórica. Un
// Gratis con origen 'manual' (el default de cualquier cuenta nueva) sí
// puede pasar a Premium por Mercado Pago: ver calcularNuevaAutorizacion
// en lib/mercadopago-logica.ts.
//
// NUNCA activa/mantiene Premium solo porque `preapproval.status ===
// "authorized"` — ese fue exactamente el bug real de producción: el
// preapproval quedó "authorized" pero el cobro real fue rechazado
// minutos después, y la usuaria siguió Premium sin haber pagado. Acá
// siempre se vuelve a preguntar por el cobro real
// (buscarPagosAutorizados) antes de decidir nada — igual que
// crearPreapproval() nunca se confía en un external_reference que venga
// del navegador, acá nunca se confía en el `status` del preapproval solo.
//
// Deja que cualquier error de Supabase se propague (no lo atrapa): quien
// llama necesita saber si la escritura falló — revalidarConMercadoPago
// (más abajo) es quien decide qué hacer con ese error (conservar el
// último estado conocido, nunca degradar Premium por no poder consultar).
export async function sincronizarSuscripcion(preapproval: Preapproval): Promise<ResultadoSincronizacion> {
  const usuarioId = preapproval.external_reference;
  if (!usuarioId) {
    console.error("[mercadopago] preapproval sin external_reference, se ignora:", preapproval.id);
    return { nivel: "gratis", ultimoPagoEstado: null, accesoHasta: null };
  }

  const supabase = crearClienteServicio();

  // Se lee el registro existente ANTES de escribir: es lo que permite no
  // perder `fecha_proximo_pago`/`acceso_hasta`/`fecha_ultimo_pago` si la
  // respuesta de Mercado Pago no vuelve a traer datos nuevos que los
  // reemplacen (ver calcularFechaProximoPago/calcularAccesoHasta).
  const { data: suscripcionExistente } = await supabase
    .from("suscripciones")
    .select("fecha_proximo_pago, fecha_ultimo_pago, acceso_hasta, ultimo_pago_estado, ultimo_pago_detalle")
    .eq("usuario_id", usuarioId)
    .eq("proveedor", "mercadopago")
    .maybeSingle();

  const fechaProximoPago = calcularFechaProximoPago({
    nextPaymentDateNueva: preapproval.next_payment_date ?? null,
    status: preapproval.status,
    fechaProximoPagoExistente: suscripcionExistente?.fecha_proximo_pago ?? null,
  });

  // Si Mercado Pago está caído justo en este llamado, se prefiere no
  // inventar ningún pago: `pagoReciente` queda null, exactamente como si
  // no existiera ningún cobro todavía (nunca se activa Premium por un
  // error de red, y tampoco se le baja el nivel a nadie por lo mismo —
  // ver más abajo, `accesoHasta` conserva el valor existente).
  const busqueda = await buscarPagosAutorizados(preapproval.id).catch((err) => {
    console.error(
      "[mercadopago] no se pudo consultar /authorized_payments/search, se conserva el último pago conocido",
      preapproval.id,
      err instanceof Error ? err.message : err
    );
    return null;
  });

  const pagoReciente = busqueda
    ? pagoMasReciente(
        busqueda.results.map((p) => ({
          status: p.status ?? null,
          paymentStatus: p.payment?.status ?? null,
          paymentStatusDetail: p.payment?.status_detail ?? null,
          dateCreated: p.date_created ?? null,
        }))
      )
    : null;

  const pagoAprobado = esPagoAprobado(pagoReciente);
  // Si la consulta a Mercado Pago falló (`busqueda === null`), no hay
  // ningún dato nuevo que reportar — se conserva el último
  // ultimo_pago_estado/ultimo_pago_detalle ya guardado en vez de pisarlo
  // con null, igual criterio que
  // fecha_proximo_pago/acceso_hasta/fecha_ultimo_pago.
  const ultimoPagoEstado = busqueda ? estadoPagoReal(pagoReciente) : (suscripcionExistente?.ultimo_pago_estado ?? null);
  const ultimoPagoDetalle = busqueda ? detallePagoReal(pagoReciente) : (suscripcionExistente?.ultimo_pago_detalle ?? null);

  // Log seguro para diagnosticar rechazos: `ultimoPagoDetalle` es un
  // código fijo que documenta Mercado Pago (ej. "cc_rejected_high_risk"),
  // nunca un dato de la tarjeta — nunca se loguea el `preapproval`
  // completo (podría traer payer_email u otros datos de la persona).
  if (ultimoPagoEstado === "rejected") {
    console.error("[mercadopago] pago rechazado", preapproval.id, "detalle:", ultimoPagoDetalle ?? "sin detalle");
  }

  const accesoHasta = calcularAccesoHasta({
    pagoAprobado,
    nextPaymentDateNueva: preapproval.next_payment_date ?? null,
    accesoHastaExistente: suscripcionExistente?.acceso_hasta ?? null,
  });

  // `fecha_ultimo_pago` (informativo, "cuándo fue el último cobro que sí
  // se acreditó") solo avanza con un pago aprobado — igual criterio que
  // acceso_hasta, nunca se pisa con la fecha de un intento rechazado.
  const fechaUltimoPago = pagoAprobado
    ? pagoReciente?.dateCreated ?? preapproval.summarized?.last_charged_date ?? suscripcionExistente?.fecha_ultimo_pago ?? null
    : suscripcionExistente?.fecha_ultimo_pago ?? null;

  const { error: errorSuscripcion } = await supabase.from("suscripciones").upsert(
    {
      usuario_id: usuarioId,
      proveedor: "mercadopago",
      proveedor_suscripcion_id: preapproval.id,
      proveedor_plan_id: preapproval.preapproval_plan_id ?? null,
      external_reference: usuarioId,
      estado: preapproval.status,
      monto: preapproval.auto_recurring?.transaction_amount ?? null,
      moneda: preapproval.auto_recurring?.currency_id ?? null,
      payer_email: preapproval.payer_email ?? null,
      fecha_inicio: preapproval.date_created ?? null,
      fecha_ultimo_pago: fechaUltimoPago,
      fecha_proximo_pago: fechaProximoPago,
      acceso_hasta: accesoHasta,
      ultimo_pago_estado: ultimoPagoEstado,
      ultimo_pago_detalle: ultimoPagoDetalle,
      cancelada_en: preapproval.status === "canceled" ? new Date().toISOString() : null,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: "usuario_id,proveedor" }
  );
  if (errorSuscripcion) throw errorSuscripcion;

  const { data: autorizacionActual } = await supabase
    .from("autorizaciones")
    .select("nivel, origen_nivel")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  const decision = calcularNuevaAutorizacion({
    autorizacionActual: autorizacionActual
      ? { nivel: autorizacionActual.nivel, origenNivel: autorizacionActual.origen_nivel }
      : null,
    vigente: esAccesoVigente(accesoHasta),
  });

  if (!decision.debeEscribir) {
    return { nivel: autorizacionActual?.nivel ?? "gratis", ultimoPagoEstado, accesoHasta };
  }

  const { error: errorAutorizacion } = await supabase
    .from("autorizaciones")
    .update({ nivel: decision.nivel, origen_nivel: decision.origenNivel })
    .eq("usuario_id", usuarioId);
  if (errorAutorizacion) throw errorAutorizacion;

  return { nivel: decision.nivel, ultimoPagoEstado, accesoHasta };
}

// Le vuelve a preguntar a Mercado Pago el estado real de la suscripción
// de una usuaria y sincroniza el resultado. Si la consulta falla
// (Mercado Pago caído, error de red, rate limit), NO se toca nada: se
// conserva el último estado confiable ya guardado y se reintenta la
// próxima vez que corresponda — nunca se le quita Premium a alguien
// solo porque no pudimos preguntar. Devuelve `true` si logró consultar
// y sincronizar, `false` si falló (para que quien llama sepa si de
// verdad hay datos frescos o sigue con los de antes).
async function revalidarConMercadoPago(usuarioId: string, proveedorSuscripcionId: string): Promise<boolean> {
  try {
    const preapproval = await obtenerPreapproval(proveedorSuscripcionId);
    await sincronizarSuscripcion(preapproval);
    return true;
  } catch (err) {
    console.error(
      "[mercadopago] no se pudo revalidar la suscripción contra la API (se conserva el último estado conocido, se reintenta en la próxima consulta)",
      usuarioId,
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

// Punto único de entrada a "¿hay algo que revalidar acá?" — lo usan
// tanto revalidarSuscripcionAhora como revalidarSiCorresponde, para que
// la protección de Premium manual y la búsqueda de la suscripción real
// vivan en un solo lugar en vez de repetirse en los dos.
//
// Nunca se consulta NI se modifica un Premium otorgado a mano (nivel=
// premium + origen_nivel='manual'): se corta ACÁ, antes incluso de mirar
// si existe una fila de suscripción — así una cortesía o alumna
// histórica no genera ningún llamado a Mercado Pago, exista o no algún
// registro viejo/residual en `suscripciones`.
async function obtenerSuscripcionRevalidable(
  usuarioId: string
): Promise<{ proveedorSuscripcionId: string; estado: EstadoPreapproval; actualizadoEn: string; accesoHasta: string | null } | null> {
  const supabase = crearClienteServicio();

  const { data: autorizacion } = await supabase
    .from("autorizaciones")
    .select("nivel, origen_nivel")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  if (autorizacion?.nivel === "premium" && autorizacion?.origen_nivel === "manual") return null;

  const { data: suscripcion } = await supabase
    .from("suscripciones")
    .select("proveedor_suscripcion_id, estado, actualizado_en, acceso_hasta")
    .eq("usuario_id", usuarioId)
    .eq("proveedor", "mercadopago")
    .maybeSingle();
  if (!suscripcion?.proveedor_suscripcion_id) return null;

  return {
    proveedorSuscripcionId: suscripcion.proveedor_suscripcion_id,
    estado: suscripcion.estado as EstadoPreapproval,
    actualizadoEn: suscripcion.actualizado_en,
    accesoHasta: suscripcion.acceso_hasta,
  };
}

// Se llama SIEMPRE, ignorando la ventana de revalidación — para cuando
// la usuaria vuelve del checkout de Mercado Pago (/membresia/resultado)
// y hace falta la verdad más fresca posible antes de decidir qué
// pantalla mostrarle. Nunca lee query params del navegador para decidir
// nada: solo dispara esta consulta server-side.
export async function revalidarSuscripcionAhora(usuarioId: string): Promise<void> {
  const info = await obtenerSuscripcionRevalidable(usuarioId);
  if (!info) return;
  await revalidarConMercadoPago(usuarioId, info.proveedorSuscripcionId);
}

// Revalidación perezosa/periódica: se llama en cada lectura de
// autorización (ver obtenerAutorizacion en lib/datos.ts) pero solo
// termina consultando a Mercado Pago si el último dato guardado ya
// pasó su ventana (`debeRevalidar`, lib/mercadopago-logica.ts — más
// corta mientras la suscripción sigue "pending", más larga una vez
// resuelta). Cubre dos casos con el mismo mecanismo: una cuenta ya
// Premium/mercadopago que hay que mantener al día, y una cuenta que
// TODAVÍA figura Gratis pero ya tiene una suscripción real de Mercado
// Pago cargada (pagó y nunca volvió bien a /membresia/resultado) — acá
// es donde esa cuenta se autocorrige a Premium sin depender de esa
// vuelta. La inmensa mayoría de las lecturas (cuentas Gratis sin
// ninguna suscripción) no generan ningún llamado a la API.
export async function revalidarSiCorresponde(usuarioId: string): Promise<void> {
  const info = await obtenerSuscripcionRevalidable(usuarioId);
  if (!info) return;
  if (!debeRevalidar(info.actualizadoEn, info.estado, info.accesoHasta)) return;

  await revalidarConMercadoPago(usuarioId, info.proveedorSuscripcionId);
}
