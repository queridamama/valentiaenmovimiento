"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearPreapproval, cancelarPreapproval } from "@/lib/mercadopago";
import { sincronizarSuscripcion } from "@/lib/suscripciones";

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

  // Anti doble-click / anti-duplicado: si ya está autorizada, no se crea
  // otra suscripción.
  const { data: existente } = await supabase
    .from("suscripciones")
    .select("estado")
    .eq("usuario_id", user.id)
    .eq("proveedor", "mercadopago")
    .maybeSingle();

  if (existente?.estado === "authorized") {
    return { error: "Ya sos parte de Valentía Premium." };
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

  // Guarda el resultado real y, si corresponde, activa Premium — el
  // mismo camino que usa la revalidación/webhook, así que es idempotente
  // y no depende de este llamado para mantenerse correcto después.
  await sincronizarSuscripcion(preapproval);

  revalidatePath("/perfil");
  revalidatePath("/membresia");

  if (preapproval.status === "authorized") return { ok: true };
  if (preapproval.status === "pending") {
    return { error: "Mercado Pago todavía está confirmando el pago. Volvé a intentar en un momento." };
  }
  return { error: "No pudimos confirmar el pago con Mercado Pago. Probá con otra tarjeta." };
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
