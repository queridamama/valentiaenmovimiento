import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { obtenerPago } from "@/lib/mercadopago";
import { TALLER_HACERLE_LUGAR, referenciaPagoTaller } from "@/lib/config/taller-hacerle-lugar";
import { Titulo, Subtitulo } from "@/components/ui";

function valorParametro(valor: string | string[] | undefined): string | null {
  return Array.isArray(valor) ? valor[0] ?? null : valor ?? null;
}

export default async function ResultadoTallerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const paymentId = valorParametro(params.payment_id) ?? valorParametro(params.collection_id);

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const query = paymentId ? `?payment_id=${encodeURIComponent(paymentId)}` : "";
    const volver = `${TALLER_HACERLE_LUGAR.resultadoPath}${query}`;
    return (
      <main className="mx-auto max-w-md space-y-5 px-6 pb-10 pt-16 text-center">
        <Titulo>Iniciá sesión para confirmar tu lugar</Titulo>
        <Subtitulo>El pago vuelve asociado a tu cuenta de Valentía.</Subtitulo>
        <Link href={`/login?redirect=${encodeURIComponent(volver)}`} className="inline-block rounded-full bg-marca px-6 py-3.5 text-sm font-semibold text-white">
          Iniciar sesión
        </Link>
      </main>
    );
  }

  if (!paymentId) {
    return (
      <main className="mx-auto max-w-md space-y-5 px-6 pb-10 pt-16 text-center">
        <Titulo>No encontramos el pago para confirmar</Titulo>
        <Subtitulo>Volvé al encuentro y probá nuevamente desde el botón de reserva.</Subtitulo>
        <Link href={TALLER_HACERLE_LUGAR.landingPath} className="inline-block text-sm font-semibold text-marca">Volver →</Link>
      </main>
    );
  }

  try {
    const pago = await obtenerPago(paymentId);
    const referenciaCorrecta = pago.external_reference === referenciaPagoTaller(user.id);
    const montoCorrecto = Number(pago.transaction_amount) === TALLER_HACERLE_LUGAR.precio;
    const monedaCorrecta = pago.currency_id === TALLER_HACERLE_LUGAR.moneda;

    if (!referenciaCorrecta || !montoCorrecto || !monedaCorrecta) {
      throw new Error("El pago no coincide con esta compra.");
    }

    const servicio = crearClienteServicio();
    await servicio.from("pagos").upsert(
      {
        usuario_id: user.id,
        mp_payment_id: String(pago.id),
        monto: Number(pago.transaction_amount),
        estado: pago.status ?? "unknown",
        concepto: TALLER_HACERLE_LUGAR.conceptoPago,
        fecha: pago.date_approved ?? pago.date_created ?? new Date().toISOString(),
      },
      { onConflict: "mp_payment_id" }
    );

    if (pago.status === "approved") {
      return (
        <main className="mx-auto max-w-md space-y-5 px-6 pb-10 pt-16 text-center">
          <p className="text-5xl">💜</p>
          <Titulo>Tu lugar está confirmado</Titulo>
          <Subtitulo>
            Ya estás adentro de Hacéle lugar a tu sueño. El acceso y el link del vivo van a aparecer en tu espacio dentro de Valentía.
          </Subtitulo>
          <Link href={TALLER_HACERLE_LUGAR.accesoPath} className="inline-block rounded-full bg-marca px-6 py-3.5 text-sm font-semibold text-white">
            Ver mi acceso →
          </Link>
        </main>
      );
    }

    if (pago.status === "rejected" || pago.status === "cancelled") {
      return (
        <main className="mx-auto max-w-md space-y-5 px-6 pb-10 pt-16 text-center">
          <Titulo>El pago no se pudo confirmar</Titulo>
          <Subtitulo>Podés volver a intentarlo con otro medio de pago.</Subtitulo>
          <Link href={TALLER_HACERLE_LUGAR.landingPath} className="inline-block rounded-full bg-marca px-6 py-3.5 text-sm font-semibold text-white">
            Intentar de nuevo
          </Link>
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-md space-y-5 px-6 pb-10 pt-16 text-center">
        <Titulo>Mercado Pago está procesando tu pago</Titulo>
        <Subtitulo>Cuando figure aprobado, tu lugar se habilita automáticamente. Podés volver a abrir esta pantalla en unos minutos.</Subtitulo>
        <Link href={TALLER_HACERLE_LUGAR.landingPath} className="inline-block text-sm font-semibold text-marca">Volver al encuentro →</Link>
      </main>
    );
  } catch (err) {
    console.error("[taller resultado] error verificando pago", err instanceof Error ? err.message : err);
    return (
      <main className="mx-auto max-w-md space-y-5 px-6 pb-10 pt-16 text-center">
        <Titulo>No pudimos verificar el pago</Titulo>
        <Subtitulo>Si ya pagaste, no vuelvas a pagar. Esperá unos minutos y entrá de nuevo desde tu cuenta.</Subtitulo>
        <Link href={TALLER_HACERLE_LUGAR.landingPath} className="inline-block text-sm font-semibold text-marca">Volver →</Link>
      </main>
    );
  }
}
