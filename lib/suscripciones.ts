import "server-only";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { obtenerPreapproval, type Preapproval, type EstadoPreapproval } from "@/lib/mercadopago";
import { calcularFechaProximoPago, esAccesoVigente, calcularNuevaAutorizacion, debeRevalidar } from "@/lib/mercadopago-logica";

// Único punto de escritura para el estado real de una suscripción de
// Mercado Pago. La llaman: la cancelación manual desde Perfil, la
// revalidación server-side por polling (revalidarSuscripcionAhora/
// revalidarSiCorresponde, más abajo — el mecanismo principal, ya que la
// activación/mantenimiento/cancelación de Premium NO dependen de que
// llegue ningún webhook) y, si algún día se confirma una forma oficial
// de registrarlo, el webhook opcional en /api/webhooks/mercadopago.
// Idempotente (upsert por usuario_id+proveedor) y nunca pisa un Premium
// otorgado a mano (nivel=premium + origen_nivel='manual') — esa es la
// protección contra que la sincronización le baje el nivel a una
// cortesía o alumna histórica. Un Gratis con origen 'manual' (el default
// de cualquier cuenta nueva) sí puede pasar a Premium por Mercado Pago:
// ver calcularNuevaAutorizacion en lib/mercadopago-logica.ts.
//
// Deja que cualquier error de Supabase se propague (no lo atrapa): quien
// llama necesita saber si la escritura falló — revalidarConMercadoPago
// (más abajo) es quien decide qué hacer con ese error (conservar el
// último estado conocido, nunca degradar Premium por no poder consultar).
export async function sincronizarSuscripcion(preapproval: Preapproval, extra?: { fechaUltimoPago?: string }) {
  const usuarioId = preapproval.external_reference;
  if (!usuarioId) {
    console.error("[mercadopago] preapproval sin external_reference, se ignora:", preapproval.id);
    return;
  }

  const supabase = crearClienteServicio();

  // Se lee el registro existente ANTES de escribir: es lo que permite no
  // perder `fecha_proximo_pago` si la respuesta de Mercado Pago para un
  // preapproval recién cancelado/pausado no vuelve a traer
  // next_payment_date (ver calcularFechaProximoPago).
  const { data: suscripcionExistente } = await supabase
    .from("suscripciones")
    .select("fecha_proximo_pago")
    .eq("usuario_id", usuarioId)
    .eq("proveedor", "mercadopago")
    .maybeSingle();

  const fechaProximoPago = calcularFechaProximoPago({
    nextPaymentDateNueva: preapproval.next_payment_date ?? null,
    status: preapproval.status,
    fechaProximoPagoExistente: suscripcionExistente?.fecha_proximo_pago ?? null,
  });

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
      fecha_ultimo_pago: extra?.fechaUltimoPago ?? preapproval.summarized?.last_charged_date ?? null,
      fecha_proximo_pago: fechaProximoPago,
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
    vigente: esAccesoVigente(preapproval.status, fechaProximoPago),
  });

  if (!decision.debeEscribir) return;

  const { error: errorAutorizacion } = await supabase
    .from("autorizaciones")
    .update({ nivel: decision.nivel, origen_nivel: decision.origenNivel })
    .eq("usuario_id", usuarioId);
  if (errorAutorizacion) throw errorAutorizacion;
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
): Promise<{ proveedorSuscripcionId: string; estado: EstadoPreapproval; actualizadoEn: string } | null> {
  const supabase = crearClienteServicio();

  const { data: autorizacion } = await supabase
    .from("autorizaciones")
    .select("nivel, origen_nivel")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  if (autorizacion?.nivel === "premium" && autorizacion?.origen_nivel === "manual") return null;

  const { data: suscripcion } = await supabase
    .from("suscripciones")
    .select("proveedor_suscripcion_id, estado, actualizado_en")
    .eq("usuario_id", usuarioId)
    .eq("proveedor", "mercadopago")
    .maybeSingle();
  if (!suscripcion?.proveedor_suscripcion_id) return null;

  return {
    proveedorSuscripcionId: suscripcion.proveedor_suscripcion_id,
    estado: suscripcion.estado as EstadoPreapproval,
    actualizadoEn: suscripcion.actualizado_en,
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
  if (!debeRevalidar(info.actualizadoEn, info.estado)) return;

  await revalidarConMercadoPago(usuarioId, info.proveedorSuscripcionId);
}
