import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerAutorizacion, obtenerSuscripcionPropia } from "@/lib/datos";
import { revalidarSuscripcionAhora } from "@/lib/suscripciones";
import { Titulo, Subtitulo } from "@/components/ui";
import RefrescoAutomatico from "@/components/RefrescoAutomatico";

// Página a la que redirige BotonSuscribirse.tsx después de que la Server
// Action ya confirmó (o no) el pago con el card_token_id — no es una
// vuelta redirigida por Mercado Pago (esta integración no usa
// init_point/Checkout hospedado, ver lib/mercadopago.ts). Igual, a
// propósito NO se decide nada mirando el resultado que ya devolvió esa
// llamada ni ningún query param: `revalidarSuscripcionAhora` vuelve a
// preguntarle a la API de Mercado Pago el estado real antes de elegir
// qué mostrar — es la única forma confiable de saberlo justo acá, y
// además cubre el caso de que se llegue a esta URL de otra forma.
export default async function ResultadoMembresiaPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await revalidarSuscripcionAhora(user.id);

  const [autorizacion, suscripcion] = await Promise.all([
    obtenerAutorizacion(supabase, user.id),
    obtenerSuscripcionPropia(supabase, user.id),
  ]);

  if (autorizacion.nivel === "premium") {
    return (
      <main className="mx-auto max-w-md space-y-5 px-6 pb-10 pt-16 text-center">
        <p className="text-5xl">💜</p>
        <Titulo>Ya sos parte de Valentía Premium</Titulo>
        <Subtitulo>Tu Proyecto de Valentía y toda la ruta ya están disponibles.</Subtitulo>
        <Link
          href="/mi-sueno"
          className="mt-2 inline-block rounded-full bg-marca px-6 py-3.5 text-sm font-semibold text-white"
        >
          Empezar mi Proyecto →
        </Link>
      </main>
    );
  }

  if (suscripcion?.estado === "canceled") {
    return (
      <main className="mx-auto max-w-md space-y-5 px-6 pb-10 pt-16 text-center">
        <Titulo>No pudimos confirmar el pago</Titulo>
        <Subtitulo>La suscripción no quedó activa. Podés volver a intentarlo cuando quieras.</Subtitulo>
        <Link href="/membresia" className="mt-2 inline-block rounded-full bg-marca px-6 py-3.5 text-sm font-semibold text-white">
          Volver a Premium
        </Link>
      </main>
    );
  }

  if (suscripcion?.estado === "paused") {
    return (
      <main className="mx-auto max-w-md space-y-5 px-6 pb-10 pt-16 text-center">
        <Titulo>Tu suscripción todavía se está confirmando</Titulo>
        <Subtitulo>Mercado Pago nos avisó que quedó en pausa. Si esto no cambia en unos minutos, escribinos.</Subtitulo>
        <Link href="/inicio" className="mt-2 inline-block text-sm font-medium text-marca">
          Ir a Inicio →
        </Link>
      </main>
    );
  }

  // Sin fila todavía o "pending": Mercado Pago está autorizando el pago.
  return (
    <main className="mx-auto max-w-md space-y-5 px-6 pb-10 pt-16 text-center">
      <RefrescoAutomatico />
      <Titulo>Estamos confirmando tu suscripción</Titulo>
      <Subtitulo>Esto puede tardar unos minutos. Esta pantalla se actualiza sola — no hace falta que hagas nada más.</Subtitulo>
      <Link href="/inicio" className="mt-2 inline-block text-sm font-medium text-marca">
        Ir a Inicio mientras tanto →
      </Link>
    </main>
  );
}
