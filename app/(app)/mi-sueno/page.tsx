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

      {recorrido.length > 0 && (
        <section className="space-y-5">
          <div className="space-y-3 rounded-[28px] bg-acentoRosa/60 p-5">
            <Etiqueta>Tu proceso</Etiqueta>
            <p className="font-display text-lg font-bold text-marca">
              {recorrido.filter((e) => e.completada).length} de {recorrido.length} completados
            </p>
            <Progreso actual={recorrido.filter((e) => e.completada).length} total={recorrido.length} />
            <p className="text-xs text-marca/50">Las clases completadas quedan disponibles para volver a verlas.</p>
          </div>

          <div className="space-y-4">
            {recorrido.map((e, i) => {
              const estado = e.completada ? "hecha" : i === primeraPendienteIdx ? "ahora" : "pendiente";
              const clicable = e.completada || i === primeraPendienteIdx;
              return (
                <TarjetaPaso
                  key={e.id}
                  numero={String(i + 1).padStart(2, "0")}
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
          <p className="pt-1 text-center text-xs text-texto/40">
            Cuando quieras ir más profundo, existe{" "}
            <Link href="/membresia" className="font-medium text-marca underline decoration-marca/30 underline-offset-4">
              Premium
            </Link>
            .
          </p>
        </section>
      )}

      {recorridoTerminado && esPremium && (
        <section className="space-y-4">
          {ruta.map((etapa) => {
            const esActual = etapa.id === proyecto?.etapa_actual;
            const hechas = etapa.experiencias.filter((e) => e.completada).length;
            return (
              <div key={etapa.id} className="space-y-3">
                <div className={`rounded-[22px] p-4 ${esActual ? "bg-marca text-white" : "bg-texto/5 opacity-60"}`}>
                  <p className="text-[15px] font-bold tracking-wide">{etapa.nombre}</p>
                  <p className={`text-xs ${esActual ? "text-white/70" : "text-texto/50"}`}>
                    {etapa.experiencias.length} experiencia{etapa.experiencias.length === 1 ? "" : "s"}
                    {etapa.experiencias.length > 0 ? ` · ${hechas} hecha${hechas === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
                {esActual && etapa.experiencias.length > 0 && (
                  <div className="space-y-4 pl-2">
                    {etapa.experiencias.map((e, i) => (
                      <TarjetaPaso
                        key={e.id}
                        numero={String(i + 1).padStart(2, "0")}
                        titulo={e.titulo}
                        descripcion={e.descripcion}
                        estado={e.completada ? "hecha" : "ahora"}
                        color={COLORES_PASO[i % COLORES_PASO.length]}
                        icono={ICONOS_PASO[i % ICONOS_PASO.length]}
                        href={`/experiencias/${e.id}`}
                        clicable
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <Link href="/mi-proyecto" className="inline-block pt-1 text-sm font-medium text-marca">
            Ver mi Proyecto →
          </Link>
        </section>
      )}
    </main>
  );
}
