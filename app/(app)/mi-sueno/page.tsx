import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import {
  obtenerAutorizacion,
  obtenerSuenoActivo,
  obtenerRecorridoEntrada,
  obtenerRuta,
  obtenerProyectoActivo,
  asegurarProyectoActivo,
} from "@/lib/datos";
import { Titulo, Subtitulo, Etiqueta, Progreso } from "@/components/ui";
import { TarjetaPaso, TarjetaCamino, COLORES_PASO } from "@/components/tarjetas";
import RutaPremiumAcordeon from "@/components/RutaPremiumAcordeon";
import type { TipoIcono } from "@/components/iconos";

const ICONOS_PASO: TipoIcono[] = ["estrella", "corazon", "montana", "documento"];

export default async function MiSuenoPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [autorizacion, sueno, recorrido] = await Promise.all([
    obtenerAutorizacion(supabase, user.id),
    obtenerSuenoActivo(supabase, user.id),
    obtenerRecorridoEntrada(supabase, user.id),
  ]);
  const esPremium = autorizacion.nivel === "premium";
  const recorridoTerminado = recorrido.length > 0 && recorrido.every((e) => e.completada);
  const primeraPendienteIdx = recorrido.findIndex((e) => !e.completada);

  let proyecto = esPremium ? await obtenerProyectoActivo(supabase, user.id) : null;
  if (esPremium && !proyecto) {
    proyecto = await asegurarProyectoActivo(supabase, user.id, sueno?.id ?? null);
  }
  const ruta = esPremium ? await obtenerRuta(supabase, user.id) : [];

  return (
    <main className="mx-auto max-w-md space-y-7 px-5 pb-6 pt-6">
      <div className="space-y-2">
        <Titulo>Mi Ruta</Titulo>
        {!recorridoTerminado ? (
          <Subtitulo>Hoy estás haciendo el recorrido de entrada. Es corto y es tuyo.</Subtitulo>
        ) : esPremium ? (
          <Subtitulo>El método completo: cinco etapas y noventa días.</Subtitulo>
        ) : (
          <Subtitulo>Ya está tu sueño. Esto es lo que hiciste con él.</Subtitulo>
        )}
      </div>

      {/* Para Premium con el recorrido ya terminado, estas mismas 4
          experiencias vuelven a aparecer más abajo dentro del módulo
          DEFINÍ de RutaPremiumAcordeon (desde que tienen etapa_id/
          modulo_id asignados) — mostrarlas acá también sería duplicarlas. */}
      {recorrido.length > 0 && !(esPremium && recorridoTerminado) && (
        <section className="space-y-5">
          <div className="space-y-3 rounded-[28px] bg-acentoRosa/60 p-5">
            <Etiqueta>Tu proceso</Etiqueta>
            <p className="font-display text-lg font-bold text-marca">
              {recorrido.filter((e) => e.completada).length} de {recorrido.length} completados
            </p>
            <Progreso actual={recorrido.filter((e) => e.completada).length} total={recorrido.length} />
            <p className="text-xs text-marca/50">Las clases completadas quedan disponibles para volver a verlas.</p>
          </div>

          <div className="flex flex-col gap-6">
            {recorrido.map((e, i) => {
              const estado = e.completada ? "hecha" : i === primeraPendienteIdx ? "ahora" : "pendiente";
              const clicable = e.completada || i === primeraPendienteIdx;
              return (
                <TarjetaPaso
                  key={e.id}
                  titulo={e.titulo}
                  descripcion={e.descripcion}
                  estado={estado}
                  color={COLORES_PASO[i % COLORES_PASO.length]}
                  icono={ICONOS_PASO[i % ICONOS_PASO.length]}
                  href={`/experiencias/${e.id}`}
                  clicable={clicable}
                />
              );
            })}
          </div>

          {!recorridoTerminado && (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-texto/70">Después de esto</p>
              <Subtitulo>La ruta completa del método son cinco etapas y noventa días.</Subtitulo>
              <Subtitulo>
                Definí, Construíte, Diseñá, Movete y Sostené: se abren cuando empezás tu Proyecto de Valentía.
              </Subtitulo>
            </div>
          )}
        </section>
      )}

      {recorridoTerminado && sueno && (
        <div className="space-y-1.5 rounded-[24px] bg-acentoRosa/50 p-5">
          <Etiqueta>Tu sueño</Etiqueta>
          <p className="text-[17px] font-medium leading-snug text-marca">{sueno.descripcion}</p>
        </div>
      )}

      {recorridoTerminado && !esPremium && (
        <section className="space-y-4">
          <p className="text-sm font-medium text-texto/70">Seguís teniendo mucho para hacer</p>
          <div className="space-y-4">
            <TarjetaCamino
              eyebrow="Movimiento de la semana"
              texto="Elegí algo concreto que vas a hacer esta semana."
              cta="Elegir mi movimiento"
              href="/movimiento"
              color="celeste"
              icono="pasos"
            />
            <TarjetaCamino
              eyebrow="Biblioteca"
              texto="Videos, meditaciones y recursos para seguir trabajando en vos."
              cta="Explorar la Biblioteca"
              href="/biblioteca"
              color="lima"
              icono="libro"
            />
            <TarjetaCamino
              eyebrow="Comunidad"
              texto="Encontrate con otras mujeres que también están en movimiento."
              cta="Entrar a la Comunidad"
              href="/comunidad"
              color="lila"
              icono="gente"
            />
          </div>

          <div className="space-y-3 rounded-[26px] bg-marca p-6 text-white">
            <Etiqueta className="!text-white/70">Premium</Etiqueta>
            <p className="font-display text-[18px] font-bold leading-snug">¿Querés trabajar este sueño más en profundidad?</p>
            <p className="text-[13.5px] leading-relaxed text-white/75">
              En Premium convertís tu sueño en un Proyecto de Valentía de 90 días, con una ruta más profunda,
              encuentros y acompañamiento.
            </p>
            <Link
              href="/membresia"
              className="inline-flex items-center gap-1.5 rounded-full bg-acentoLima px-5 py-2.5 text-[13px] font-semibold text-marca"
            >
              Sumarme a Premium <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      )}

      {recorridoTerminado && esPremium && (
        <section className="space-y-4">
          <RutaPremiumAcordeon etapas={ruta} etapaActualId={proyecto?.etapa_actual ?? null} />
          <Link
            href="/mi-proyecto"
            className="block rounded-[22px] bg-marca px-5 py-4 text-center text-[14px] font-semibold text-white"
          >
            Ver mi Proyecto de Valentía →
          </Link>
        </section>
      )}
    </main>
  );
}
