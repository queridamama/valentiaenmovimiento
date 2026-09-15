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
import { Badge, EstadoBadge, Tarjeta, EnlacePrimario, Titulo, Subtitulo } from "@/components/ui";

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
    <main className="mx-auto max-w-md space-y-8 px-6 pt-10 pb-6">
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

      {!recorridoTerminado && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge tipo="gratis" />
            <span className="text-xs text-texto/45">
              {recorrido.filter((e) => e.completada).length} de {recorrido.length}
            </span>
          </div>
          <p className="font-medium">Tomate tus sueños en serio</p>
          <div className="space-y-2">
            {recorrido.map((e, i) => {
              const estado = e.completada ? "hecha" : i === primeraPendienteIdx ? "ahora" : "pendiente";
              const clicable = e.completada || i === primeraPendienteIdx;
              const contenido = (
                <div
                  className={`flex items-center justify-between gap-3 rounded-card border p-4 ${
                    estado === "ahora" ? "border-texto bg-texto text-white" : "border-texto/10 bg-tarjeta"
                  } ${!clicable ? "opacity-50" : ""}`}
                >
                  <span className={`text-[15px] font-medium ${estado === "ahora" ? "text-white" : "text-texto"}`}>
                    {e.titulo}
                  </span>
                  <EstadoBadge estado={estado} />
                </div>
              );
              return clicable ? (
                <Link key={e.id} href={`/experiencias/${e.id}`}>
                  {contenido}
                </Link>
              ) : (
                <div key={e.id}>{contenido}</div>
              );
            })}
          </div>

          <div className="space-y-2 pt-4">
            <p className="text-sm font-medium text-texto/70">Después de esto</p>
            <Subtitulo>La ruta completa del método son cinco etapas y noventa días.</Subtitulo>
            <Subtitulo>
              Definí, Construíte, Diseñá, Movete y Sostené: se abren cuando empezás tu Proyecto de Valentía.
            </Subtitulo>
          </div>
        </section>
      )}

      {recorridoTerminado && sueno && (
        <Tarjeta className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-texto/45">Tu sueño</p>
          <p className="text-[17px] font-medium leading-snug">{sueno.descripcion}</p>
        </Tarjeta>
      )}

      {recorridoTerminado && !esPremium && (
        <Tarjeta className="space-y-3 border-acento/40 bg-acento/5">
          <p className="text-[17px] font-medium leading-snug">Convertí tu sueño en un Proyecto de Valentía</p>
          <Subtitulo>Noventa días con método, ruta completa, hitos y revisiones.</Subtitulo>
          <EnlacePrimario href="/membresia">Empezar mis 90 días</EnlacePrimario>
        </Tarjeta>
      )}

      {recorridoTerminado && esPremium && (
        <section className="space-y-3">
          {ruta.map((etapa) => {
            const esActual = etapa.id === proyecto?.etapa_actual;
            const hechas = etapa.experiencias.filter((e) => e.completada).length;
            return (
              <div key={etapa.id} className="space-y-2">
                <div
                  className={`rounded-card border p-4 ${
                    esActual ? "border-acento/50 bg-acento/5" : "border-texto/10 bg-tarjeta opacity-70"
                  }`}
                >
                  <p className="text-[15px] font-bold tracking-wide">{etapa.nombre}</p>
                  <p className="text-xs text-texto/50">
                    {etapa.experiencias.length} experiencia{etapa.experiencias.length === 1 ? "" : "s"}
                    {etapa.experiencias.length > 0 ? ` · ${hechas} hecha${hechas === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
                {esActual && etapa.experiencias.length > 0 && (
                  <div className="space-y-2 pl-3">
                    {etapa.experiencias.map((e) => {
                      const estado = e.completada ? "hecha" : "ahora";
                      return (
                        <Link
                          key={e.id}
                          href={`/experiencias/${e.id}`}
                          className={`flex items-center justify-between gap-3 rounded-card border p-4 ${
                            estado === "ahora" ? "border-texto bg-texto text-white" : "border-texto/10 bg-tarjeta"
                          }`}
                        >
                          <span className={`text-[15px] font-medium ${estado === "ahora" ? "text-white" : "text-texto"}`}>
                            {e.titulo}
                          </span>
                          <EstadoBadge estado={estado} />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <Link href="/mi-proyecto" className="inline-block pt-2 text-sm font-medium text-acento">
            Ver mi Proyecto →
          </Link>
        </section>
      )}
    </main>
  );
}
