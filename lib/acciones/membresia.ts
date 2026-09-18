"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearPreapproval, crearPreapprovalSinPlan, cancelarPreapproval, type EstadoPreapproval } from "@/lib/mercadopago";
import { sincronizarSuscripcion, marcarModalidadSuscripcion } from "@/lib/suscripciones";
import { puedeIniciarNuevaSuscripcion } from "@/lib/mercadopago-logica";

function backUrlResultado(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/membresia/resultado`;
}

// Guard compartido por iniciarSuscripcion() e iniciarSuscripcionAlojada():
// ninguna de las dos puede crear un preapproval nuevo mientras exista
// otro sin cancelar para esta usuaria — sea cual sea el flujo que lo haya
// creado (Card Form o checkout alojado comparten la misma fila,
// usuario_id + proveedor='mercadopago') y sea cual sea su `estado`
// (pending/authorized/paused). Es exactamente lo que evita terminar con
// dos preapprovals, y eventualmente dos cobros, activos a la vez para la
// misma usuaria. Tiene que cancelar el anterior primero (ver
// BotonCancelarSuscripcion en Perfil) — una vez cancelado, cualquiera de
// los dos flujos puede iniciar uno nuevo (puedeIniciarNuevaSuscripcion).
async function verificarSinSuscripcionActiva(supabase: SupabaseClient, usuarioId: string): Promise<{ ok: true } | { error: string }> {
  const { data: suscripcionExistente } = await supabase
    .from("suscripciones")
    .select("estado")
    .eq("usuario_id", usuarioId)
    .eq("proveedor", "mercadopago")
    .maybeSingle();

  if (!puedeIniciarNuevaSuscripcion((suscripcionExistente?.estado as EstadoPreapproval) ?? null)) {
    return { error: "Ya tenés una suscripción de Mercado Pago en curso. Cancelala desde tu Perfil antes de probar otro método de pago." };
  }

  // Premium otorgado a mano (cortesía/alumna histórica) y sin ninguna
  // fila de Mercado Pago propia: no hay nada que cancelar, pero tampoco
  // tiene sentido dejarla iniciar un cobro real encima de un Premium ya
  // otorgado.
  if (!suscripcionExistente) {
    const { data: autorizacionActual } = await supabase.from("autorizaciones").select("nivel").eq("usuario_id", usuarioId).maybeSingle();
    if (autorizacionActual?.nivel === "premium") {
      return { error: "Ya sos parte de Valentía Premium." };
    }
  }

  return { ok: true };
}

// Card Form + card_token_id: flujo histórico, reemplazado en la UI por
// iniciarSuscripcionAlojada() (checkout alojado, más abajo) desde que ese
// flujo se validó con una transacción real. Se conserva sin usarse desde
// /membresia como camino de rollback — components/BotonSuscribirse.tsx
// ya no se renderiza ahí, pero sigue existiendo. Confirma la suscripción
// de la usuaria logueada usando el `card_token_id` que ya generó Mercado
// Pago del lado del cliente (Card Form de @mercadopago/sdk-js). Es lo
// ÚNICO que se acepta del cliente acá, junto con `deviceId`: el usuario,
// su email y el plan/precio salen siempre de la sesión y de la
// configuración del servidor, nunca de lo que mande el navegador — así
// nadie puede activar Premium propio (ni de otra persona) mandando un
// userId, email o precio distinto. Server Action, no route handler: el
// ACCESS TOKEN (usado dentro de lib/mercadopago.ts) nunca se acerca al
// cliente.
//
// `deviceId` es el Device ID antifraude que genera el script de
// seguridad de Mercado Pago en el navegador (`window.MP_DEVICE_SESSION_ID`,
// ver components/BotonSuscribirse.tsx) — información técnica del
// dispositivo/sesión, nunca un dato de la tarjeta. Mercado Pago lo
// recomienda para mejorar la aprobación de pagos, pero no es un
// requisito estricto del endpoint: si el script todavía no terminó de
// generarlo (carga lenta, bloqueado), se sigue igual sin bloquear a la
// usuaria — solo queda una suscripción con peor información antifraude,
// no un error.
export async function iniciarSuscripcion(cardTokenId: string, deviceId: string | null): Promise<{ ok: true } | { error: string }> {
  if (typeof cardTokenId !== "string" || cardTokenId.trim().length === 0) {
    return { error: "No pudimos validar los datos de la tarjeta. Probá de nuevo." };
  }
  const deviceIdLimpio = typeof deviceId === "string" && deviceId.trim().length > 0 ? deviceId.trim() : null;
  if (!deviceIdLimpio) {
    console.warn("[membresia] iniciando suscripción sin Device ID de Mercado Pago (antifraude) — MP_DEVICE_SESSION_ID no estaba disponible");
  }

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Necesitás iniciar sesión para sumarte a Premium." };

  const chequeo = await verificarSinSuscripcionActiva(supabase, user.id);
  if ("error" in chequeo) return chequeo;

  let preapproval;
  try {
    preapproval = await crearPreapproval({
      payerEmail: user.email,
      externalReference: user.id,
      backUrl: backUrlResultado(),
      cardTokenId: cardTokenId.trim(),
      deviceId: deviceIdLimpio,
    });
  } catch (err) {
    // El token de tarjeta es efímero y de un solo uso — nunca se loguea
    // (ni él ni ningún dato de la tarjeta), solo el mensaje de error que
    // devuelve Mercado Pago.
    console.error("[membresia] error creando preapproval", err instanceof Error ? err.message : err);
    return { error: "No pudimos procesar tu tarjeta con Mercado Pago. Verificá los datos e intentá de nuevo." };
  }

  // sincronizarSuscripcion es quien de verdad decide si corresponde
  // Premium: vuelve a consultar el cobro real contra Mercado Pago (nunca
  // alcanza con que el preapproval haya quedado "authorized", ver el
  // comentario grande en lib/suscripciones.ts) — el mismo camino que usa
  // la revalidación/webhook, así que es idempotente y no depende de este
  // llamado para mantenerse correcto después.
  const resultado = await sincronizarSuscripcion(preapproval);
  await marcarModalidadSuscripcion(user.id, "card_form");

  revalidatePath("/perfil");
  revalidatePath("/membresia");

  if (resultado.nivel === "premium") return { ok: true };
  if (resultado.ultimoPagoEstado === "rejected") {
    return { error: "Mercado Pago rechazó el pago con esa tarjeta. Probá con otra tarjeta o medio de pago." };
  }
  return { error: "Estamos confirmando tu pago con Mercado Pago. Puede tardar unos minutos — te avisamos apenas se confirme." };
}

// Flujo oficial de Mercado Pago que usa /membresia: "Suscripciones sin
// plan asociado" + pago pendiente + checkout alojado (ver
// crearPreapprovalSinPlan en lib/mercadopago.ts), validado con una
// transacción real. Reemplaza a iniciarSuscripcion() (Card Form) en la
// UI — ver components/BotonSuscribirseAlojado.tsx,
// app/(app)/membresia/page.tsx.
//
// No recibe NADA del cliente relacionado a un medio de pago — ni token
// ni tarjeta: acá nuestra app nunca los recibe. Usuario, email, plan y
// precio salen de la sesión y de la configuración del servidor, igual
// que en iniciarSuscripcion(). Devuelve únicamente el `init_point` para
// que el navegador redirija — nunca el Access Token.
//
// Igual que iniciarSuscripcion(): "pending" (o que al volver del
// checkout el preapproval ya figure "authorized") nunca activa Premium
// por sí solo. sincronizarSuscripcion es quien confirma el pago real
// contra /authorized_payments/search — si esa consulta todavía no
// encuentra ningún cobro (algo esperable apenas se crea, o incluso justo
// al volver del checkout si Mercado Pago tarda en procesarlo), la
// usuaria queda en Gratis con la suscripción en estado real "pending"/
// "authorized" — nunca se le inventa acceso ni se le marca un error,
// queda como "confirmando" (ver /membresia/resultado).
export async function iniciarSuscripcionAlojada(): Promise<{ ok: true; initPoint: string } | { error: string }> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Necesitás iniciar sesión para sumarte a Premium." };

  const chequeo = await verificarSinSuscripcionActiva(supabase, user.id);
  if ("error" in chequeo) return chequeo;

  let preapproval;
  try {
    preapproval = await crearPreapprovalSinPlan({
      payerEmail: user.email,
      externalReference: user.id,
      backUrl: backUrlResultado(),
    });
  } catch (err) {
    console.error("[membresia] error creando preapproval sin plan (checkout alojado)", err instanceof Error ? err.message : err);
    return { error: "No pudimos iniciar la suscripción con Mercado Pago. Probá de nuevo en unos minutos." };
  }

  if (!preapproval.init_point) {
    console.error("[membresia] preapproval sin plan creado sin init_point", preapproval.id);
    return { error: "Mercado Pago no nos devolvió el link de pago. Probá de nuevo en unos minutos." };
  }

  // Se sincroniza (deja la fila guardada con esta usuaria y el
  // proveedor_suscripcion_id real) ANTES de redirigir — así, si hace
  // doble click o se abre dos pestañas, verificarSinSuscripcionActiva ya
  // encuentra esta fila y bloquea un segundo preapproval sin depender de
  // que la usuaria complete el checkout. Todavía "pending", nunca activa
  // Premium acá.
  await sincronizarSuscripcion(preapproval);
  await marcarModalidadSuscripcion(user.id, "checkout_alojado");

  revalidatePath("/perfil");
  revalidatePath("/membresia");

  return { ok: true, initPoint: preapproval.init_point };
}

// Cancela la suscripción real en Mercado Pago (API oficial, no un flag
// local) y sincroniza el resultado. Si la usuaria conserva acceso hasta
// el fin de un período ya pagado, `sincronizarSuscripcion` es quien
// decide eso — acá no se toca `autorizaciones` directo.
export async function cancelarSuscripcion(): Promise<{ ok: true } | { error: string }> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Necesitás iniciar sesión." };

  const { data: suscripcion } = await supabase
    .from("suscripciones")
    .select("proveedor_suscripcion_id, estado")
    .eq("usuario_id", user.id)
    .eq("proveedor", "mercadopago")
    .maybeSingle();

  if (!suscripcion?.proveedor_suscripcion_id) {
    return { error: "No encontramos una suscripción de Mercado Pago asociada a tu cuenta." };
  }
  if (suscripcion.estado === "canceled") return { ok: true };

  try {
    const preapproval = await cancelarPreapproval(suscripcion.proveedor_suscripcion_id);
    await sincronizarSuscripcion(preapproval);
  } catch (err) {
    console.error("[membresia] error cancelando preapproval", err instanceof Error ? err.message : err);
    return { error: "No pudimos cancelar la suscripción. Probá de nuevo en unos minutos." };
  }

  revalidatePath("/perfil");
  revalidatePath("/membresia");
  return { ok: true };
}
