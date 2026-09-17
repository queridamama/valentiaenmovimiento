"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { crearPreapproval, cancelarPreapproval, obtenerPreapproval } from "@/lib/mercadopago";
import { sincronizarSuscripcion } from "@/lib/suscripciones";

function backUrlResultado(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/membresia/resultado`;
}

// Inicia (o retoma) una suscripción de Mercado Pago para la usuaria
// logueada. Nunca activa Premium acá — solo crea el preapproval y
// devuelve el link de pago; la activación real la hace el webhook
// cuando Mercado Pago confirma. Server Action, no route handler: así el
// ACCESS TOKEN (usado dentro de lib/mercadopago.ts) nunca se acerca al
// cliente.
export async function iniciarSuscripcion(): Promise<{ url: string } | { error: string }> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Necesitás iniciar sesión para sumarte a Premium." };

  // Anti doble-click / anti-duplicado (punto 19 del brief): si ya hay una
  // fila de suscripción para esta usuaria, no se crea un preapproval
  // nuevo — se reutiliza o se informa el estado real.
  const { data: existente } = await supabase
    .from("suscripciones")
    .select("proveedor_suscripcion_id, estado")
    .eq("usuario_id", user.id)
    .eq("proveedor", "mercadopago")
    .maybeSingle();

  if (existente?.estado === "authorized") {
    return { error: "Ya sos parte de Valentía Premium." };
  }

  if (existente?.estado === "pending" && existente.proveedor_suscripcion_id) {
    try {
      const preapproval = await obtenerPreapproval(existente.proveedor_suscripcion_id);
      if (preapproval.status === "pending" && preapproval.init_point) {
        return { url: preapproval.init_point };
      }
    } catch {
      // Si la consulta falla (ej. el preapproval quedó viejo/inválido),
      // se sigue abajo y se crea uno nuevo en vez de dejarla trabada.
    }
  }

  let preapproval;
  try {
    preapproval = await crearPreapproval({
      payerEmail: user.email,
      externalReference: user.id,
      backUrl: backUrlResultado(),
    });
  } catch (err) {
    console.error("[membresia] error creando preapproval", err instanceof Error ? err.message : err);
    return { error: "No pudimos iniciar la suscripción con Mercado Pago. Probá de nuevo en unos minutos." };
  }

  const servicio = crearClienteServicio();
  await servicio.from("suscripciones").upsert(
    {
      usuario_id: user.id,
      proveedor: "mercadopago",
      proveedor_suscripcion_id: preapproval.id,
      proveedor_plan_id: preapproval.preapproval_plan_id ?? process.env.MERCADOPAGO_PREAPPROVAL_PLAN_ID ?? null,
      external_reference: user.id,
      estado: preapproval.status,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: "usuario_id,proveedor" }
  );

  if (!preapproval.init_point) {
    return { error: "Mercado Pago no devolvió un link de pago. Probá de nuevo en unos minutos." };
  }
  return { url: preapproval.init_point };
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
  if (suscripcion.estado === "cancelled") return { ok: true };

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
