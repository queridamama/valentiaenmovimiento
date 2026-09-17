import "server-only";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import type { Preapproval } from "@/lib/mercadopago";

// Un preapproval "paused" o "cancelled" todavía puede tener acceso
// vigente si ya pagó el ciclo en curso: `next_payment_date` es la fecha
// del próximo cobro programado ANTES de la baja, o sea, hasta cuándo
// alcanza lo que ya pagó. No se corta a mitad de período (ver brief) —
// ver el LÍMITE CONOCIDO documentado en lib/mercadopago.ts sobre este
// campo, no verificado contra documentación en vivo desde este entorno.
function accesoVigente(preapproval: Preapproval): boolean {
  if (preapproval.status === "authorized") return true;
  if (preapproval.status === "pending") return false;
  if (!preapproval.next_payment_date) return false;
  return new Date(preapproval.next_payment_date).getTime() > Date.now();
}

// Único punto de escritura para el estado real de una suscripción de
// Mercado Pago: lo llama el webhook y la cancelación manual desde Perfil.
// Idempotente (upsert por usuario_id+proveedor) y nunca pisa un Premium
// otorgado a mano (origen_nivel = 'manual') — esa es la protección contra
// que un webhook le baje el nivel a una cortesía o alumna histórica.
export async function sincronizarSuscripcion(preapproval: Preapproval, extra?: { fechaUltimoPago?: string }) {
  const usuarioId = preapproval.external_reference;
  if (!usuarioId) {
    console.error("[mercadopago] preapproval sin external_reference, se ignora:", preapproval.id);
    return;
  }

  const supabase = crearClienteServicio();

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
      fecha_proximo_pago: preapproval.next_payment_date ?? null,
      cancelada_en: preapproval.status === "cancelled" ? new Date().toISOString() : null,
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

  if (autorizacionActual?.origen_nivel === "manual") return;

  const nivelObjetivo = accesoVigente(preapproval) ? "premium" : "gratis";
  if (autorizacionActual?.nivel === nivelObjetivo && autorizacionActual?.origen_nivel === "mercadopago") return;

  const { error: errorAutorizacion } = await supabase
    .from("autorizaciones")
    .update({ nivel: nivelObjetivo, origen_nivel: "mercadopago" })
    .eq("usuario_id", usuarioId);
  if (errorAutorizacion) throw errorAutorizacion;
}
