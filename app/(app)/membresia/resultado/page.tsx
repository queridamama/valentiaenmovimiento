import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerAutorizacion, obtenerSuscripcionPropia } from "@/lib/datos";
import { revalidarSuscripcionAhora } from "@/lib/suscripciones";
import { Titulo, Subtitulo } from "@/components/ui";
import RefrescoAutomatico from "@/components/RefrescoAutomatico";

// Página a la que se llega desde el checkout alojado
// (BotonSuscribirseAlojado.tsx): es la vuelta real del `back_url`
// después de que la usuaria completó (o no) el pago en el checkout
// hospedado de Mercado Pago. También sigue cubriendo el Card Form
// histórico (BotonSuscribirse.tsx, ya no se muestra en /membresia pero
// queda como rollback) para el caso de que se vuelva a habilitar — ver
// `modalidad` en `suscripciones`, solo observabilidad, acá no importa
// cuál fue.
// En los dos casos, a propósito NO se decide nada mirando el resultado
// que ya devolvió la Server Action ni ningún query param que traiga la
// URL: `revalidarSuscripcionAhora` siempre vuelve a preguntarle a la API
// de Mercado Pago el estado real antes de elegir qué mostrar — es la
// única forma confiable de saberlo justo acá (para el checkout alojado
// en particular, es además la primera vez que confirmamos algo: hasta
// este momento la usuaria estuvo pagando en Mercado Pago, no en nuestra
// app), y además cubre el caso de que se llegue a esta URL de otra
// forma. Si el pago con el que volvió todavía no aparece en
// /authorized_payments/search (puede tardar más en confirmarse desde un
// checkout alojado que desde el card_token del Card Form), esto no
// inventa acceso ni marca error: cae en la rama de abajo
// ("confirmando").
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

  // El preapproval puede seguir "authorized" (Mercado Pago no lo cancela
  // solo porque un cobro puntual se rechace, ver lib/suscripciones.ts) —
  // por eso este caso se distingue por `ultimo_pago_estado`, no por
  // `estado`. Sin esto, un pago rechazado caía en la rama de "estamos
  // confirmando" de abajo y quedaba reintentando para siempre.
  if (suscripcion?.ultimo_pago_estado === "rejected") {
    return (
      <main className="mx-auto max-w-md space-y-5 px-6 pb-10 pt-16 text-center">
        <Titulo>Mercado Pago rechazó el pago</Titulo>
        <Subtitulo>Probá de nuevo con otra tarjeta o medio de pago.</Subtitulo>
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
