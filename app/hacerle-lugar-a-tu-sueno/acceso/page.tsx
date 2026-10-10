import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { obtenerAutorizacion } from "@/lib/datos";
import { TALLER_HACERLE_LUGAR } from "@/lib/config/taller-hacerle-lugar";
import { Etiqueta, Titulo, Subtitulo } from "@/components/ui";

export default async function AccesoTallerPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(TALLER_HACERLE_LUGAR.accesoPath)}`);
  }

  const [autorizacion, compra] = await Promise.all([
    obtenerAutorizacion(supabase, user.id),
    supabase
      .from("pagos")
      .select("id")
      .eq("usuario_id", user.id)
      .eq("concepto", TALLER_HACERLE_LUGAR.conceptoPago)
      .eq("estado", "approved")
      .limit(1)
      .maybeSingle(),
  ]);

  const esPremium = autorizacion.nivel === "premium";
  const tieneCompra = Boolean(compra.data);

  if (!esPremium && !tieneCompra) {
    redirect(TALLER_HACERLE_LUGAR.landingPath);
  }

  const servicio = crearClienteServicio();
  const { data: evento } = await servicio
    .from("eventos")
    .select("titulo, descripcion, fecha_hora, link_externo")
    .eq("id", TALLER_HACERLE_LUGAR.eventoId)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-md space-y-6 px-5 pb-12 pt-10">
      <Etiqueta>{esPremium ? "Incluido en tu Premium" : "Tu encuentro"}</Etiqueta>
      <Titulo>{evento?.titulo ?? TALLER_HACERLE_LUGAR.titulo}</Titulo>
      <Subtitulo>{evento?.descripcion ?? TALLER_HACERLE_LUGAR.bajada}</Subtitulo>

      <div className="rounded-[26px] bg-acento/20 p-5">
        <p className="font-semibold text-marca">{TALLER_HACERLE_LUGAR.fechaLabel} · {TALLER_HACERLE_LUGAR.horaLabel}</p>
        <p className="mt-2 text-sm leading-relaxed text-texto/60">
          {evento?.link_externo
            ? "El link del vivo ya está disponible."
            : "Tu lugar ya está guardado. El link del vivo se va a habilitar acá antes del encuentro."}
        </p>
      </div>

      {evento?.link_externo ? (
        <a href={evento.link_externo} target="_blank" rel="noreferrer" className="block rounded-full bg-marca px-6 py-4 text-center text-[15px] font-semibold text-white">
          Entrar al vivo →
        </a>
      ) : (
        <Link href="/inicio" className="block rounded-full border border-texto/15 px-6 py-4 text-center text-[15px] font-semibold text-texto">
          Volver a Inicio
        </Link>
      )}
    </main>
  );
}
