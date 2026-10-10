"use server";

import { crearClienteServidor } from "@/lib/supabase/server";
import { crearPreferenciaPagoUnico } from "@/lib/mercadopago";
import { TALLER_HACERLE_LUGAR, referenciaPagoTaller } from "@/lib/config/taller-hacerle-lugar";

function urlBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function iniciarCompraTaller(): Promise<{ ok: true; initPoint: string } | { error: string }> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Necesitás iniciar sesión para reservar tu lugar." };
  }

  const { data: yaPago } = await supabase
    .from("pagos")
    .select("id")
    .eq("usuario_id", user.id)
    .eq("concepto", TALLER_HACERLE_LUGAR.conceptoPago)
    .eq("estado", "approved")
    .limit(1)
    .maybeSingle();

  if (yaPago) {
    return { ok: true, initPoint: TALLER_HACERLE_LUGAR.accesoPath };
  }

  const base = urlBase();
  const retorno = `${base}${TALLER_HACERLE_LUGAR.resultadoPath}`;

  try {
    const preferencia = await crearPreferenciaPagoUnico({
      title: TALLER_HACERLE_LUGAR.titulo,
      amount: TALLER_HACERLE_LUGAR.precio,
      currency: TALLER_HACERLE_LUGAR.moneda,
      payerEmail: user.email,
      externalReference: referenciaPagoTaller(user.id),
      successUrl: retorno,
      pendingUrl: retorno,
      failureUrl: retorno,
    });

    if (!preferencia.init_point) {
      return { error: "Mercado Pago no nos devolvió el link de pago. Probá de nuevo en unos minutos." };
    }
    return { ok: true, initPoint: preferencia.init_point };
  } catch (err) {
    console.error("[taller] error creando preferencia de pago", err instanceof Error ? err.message : err);
    return { error: "No pudimos iniciar el pago con Mercado Pago. Probá de nuevo en unos minutos." };
  }
}
