"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearPreapproval, cancelarPreapproval, type EstadoPreapproval } from "@/lib/mercadopago";
import { sincronizarSuscripcion } from "@/lib/suscripciones";
import { puedeIniciarNuevaSuscripcion } from "@/lib/mercadopago-logica";

function backUrlResultado(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/membresia/resultado`;
}

// Confirma la suscripción de la usuaria logueada usando el `card_token_id`
// que ya generó Mercado Pago del lado del cliente (Card Form de
// @mercadopago/sdk-js — ver components/BotonSuscribirse.tsx). Es lo
// ÚNICO que se acepta del cliente acá: el usuario, su email y el plan/
// precio salen siempre de la sesión y de la configuración del servidor,
// nunca de lo que mande el navegador — así nadie puede activar Premium
// propio (ni de otra persona) mandando un userId, email o precio
// distinto. Server Action, no route handler: el ACCESS TOKEN (usado
// dentro de lib/mercadopago.ts) nunca se acerca al cliente.
export async function iniciarSuscripcion(cardTokenId: string): Promise<{ ok: true } | { error: string }> {
  if (typeof cardTokenId !== "string" || cardTokenId.trim().length === 0) {
    return { error: "No pudimos validar los datos de la tarjeta. Probá de nuevo." };
  }

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Necesitás iniciar sesión para sumarte a Premium." };

  // Nunca se crea un preapproval nuevo mientras ya exista uno sin
  // cancelar para esta usuaria — sea cual sea su `estado`
  // (pending/authorized/paused) y sea cual sea el nivel actual (Gratis
  // incluido: un preapproval "authorized" con el primer cobro rechazado
  // deja a la usuaria en Gratis, pero Mercado Pago puede seguir
  // reintentando ese mismo preapproval en segundo plano — dejar crear
  // otro acá terminaría en dos preapprovals, y eventualmente dos cobros,
  // activos a la vez). Tiene que cancelar el anterior primero (ver
  // BotonCancelarSuscripcion en Perfil, ahora visible también en ese
  // caso). Una vez cancelado, sí puede iniciar uno nuevo con otra
  // tarjeta — ver puedeIniciarNuevaSuscripcion.
  const { data: suscripcionExistente } = await supabase
    .from("suscripciones")
    .select("estado")
    .eq("usuario_id", user.id)
    .eq("proveedor", "mercadopago")
    .maybeSingle();

  if (!puedeIniciarNuevaSuscripcion((suscripcionExistente?.estado as EstadoPreapproval) ?? null)) {
    return { error: "Ya tenés una suscripción de Mercado Pago en curso. Cancelala desde tu Perfil antes de probar con otra tarjeta." };
  }

  // Premium otorgado a mano (cortesía/alumna histórica) y sin ninguna
  // fila de Mercado Pago propia: no hay nada que cancelar, pero tampoco
  // tiene sentido dejarla iniciar un cobro real encima de un Premium ya
  // otorgado.
  if (!suscripcionExistente) {
    const { data: autorizacionActual } = await supabase.from("autorizaciones").select("nivel").eq("usuario_id", user.id).maybeSingle();
    if (autorizacionActual?.nivel === "premium") {
      return { error: "Ya sos parte de Valentía Premium." };
    }
  }

  let preapproval;
  try {
    preapproval = await crearPreapproval({
      payerEmail: user.email,
      externalReference: user.id,
      backUrl: backUrlResultado(),
      cardTokenId: cardTokenId.trim(),
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

  revalidatePath("/perfil");
  revalidatePath("/membresia");

  if (resultado.nivel === "premium") return { ok: true };
  if (resultado.ultimoPagoEstado === "rejected") {
    return { error: "Mercado Pago rechazó el pago con esa tarjeta. Probá con otra tarjeta o medio de pago." };
  }
  return { error: "Estamos confirmando tu pago con Mercado Pago. Puede tardar unos minutos — te avisamos apenas se confirme." };
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
