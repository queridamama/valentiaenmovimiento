import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerAutorizacion, obtenerSuscripcionPropia } from "@/lib/datos";
import { Titulo, Subtitulo } from "@/components/ui";
import RefrescoAutomatico from "@/components/RefrescoAutomatico";

// Vuelta desde Mercado Pago. A propósito NO lee ningún query param del
// checkout (status=approved, collection_status, etc.) para decidir nada:
// esos valores los pone el navegador/Mercado Pago del lado del cliente y
// no son una confirmación real. Lo único que importa es lo que ya
// quedó guardado en nuestra base por el webhook — si todavía no llegó,
// se muestra "procesando" y la página se refresca sola hasta que llegue.
export default async function ResultadoMembresiaPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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
