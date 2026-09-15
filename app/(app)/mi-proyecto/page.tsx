import { crearClienteServidor } from "@/lib/supabase/server";
import {
  obtenerAutorizacion,
  obtenerSuenoActivo,
  obtenerRespuestasPorArea,
  obtenerMovimientoActual,
  obtenerEvidencias,
  obtenerProyectoActivo,
} from "@/lib/datos";
import { diaDelProyecto } from "@/lib/fechas";
import { Tarjeta, Titulo, Subtitulo } from "@/components/ui";
import type { AreaRespuesta } from "@/lib/tipos";

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="text-sm italic text-texto/35">{texto}</p>;
}

export default async function MiProyectoPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [autorizacion, sueno, respuestas, movimiento, evidencias, proyecto] = await Promise.all([
    obtenerAutorizacion(supabase, user.id),
    obtenerSuenoActivo(supabase, user.id),
    obtenerRespuestasPorArea(supabase, user.id),
    obtenerMovimientoActual(supabase, user.id),
    obtenerEvidencias(supabase, user.id),
    obtenerProyectoActivo(supabase, user.id),
  ]);

  const area = (a: AreaRespuesta) => respuestas.get(a) ?? [];
  const ultima = (a: AreaRespuesta) => area(a).at(-1);
  const estandaresYDecisiones = [...area("estandar"), ...area("decision")].sort((a, b) =>
    a.fecha.localeCompare(b.fecha)
  );

  return (
    <main className="mx-auto max-w-md space-y-8 px-6 pt-10 pb-10">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-texto/45">
          Documento vivo{proyecto ? ` · Día ${diaDelProyecto(proyecto.fecha_inicio)}` : ""}
        </p>
        <Titulo>Mi Proyecto de Valentía</Titulo>
        <Subtitulo>Se escribe solo, con lo que respondés en cada experiencia.</Subtitulo>
      </div>

      <Seccion titulo="Mi sueño">
        {sueno ? <Tarjeta>{sueno.descripcion}</Tarjeta> : <Vacio texto="Todavía no lo declaraste." />}
      </Seccion>

      <Seccion titulo="Mi para qué">
        {sueno?.por_que_importa ? (
          <Tarjeta>{sueno.por_que_importa}</Tarjeta>
        ) : (
          <Vacio texto="Todavía no lo escribiste." />
        )}
      </Seccion>

      <Seccion titulo="Mi punto de partida">
        {ultima("punto_partida") ? (
          <Tarjeta>{ultima("punto_partida")!.respuesta}</Tarjeta>
        ) : (
          <Vacio texto="Todavía no hay respuesta." />
        )}
      </Seccion>

      <Seccion titulo="Resultado a los 90 días">
        {ultima("resultado_90_dias") ? (
          <Tarjeta>{ultima("resultado_90_dias")!.respuesta}</Tarjeta>
        ) : (
          <Vacio texto="Se completa en la declaración de tu Proyecto." />
        )}
      </Seccion>

      <Seccion titulo="Identidad que estoy practicando">
        {ultima("identidad") ? (
          <Tarjeta>{ultima("identidad")!.respuesta}</Tarjeta>
        ) : (
          <Vacio texto="Se completa en las experiencias de Construíte (Premium)." />
        )}
      </Seccion>

      <Seccion titulo="Estándares y decisiones">
        {estandaresYDecisiones.length > 0 ? (
          <ul className="space-y-2">
            {estandaresYDecisiones.map((r, i) => (
              <li key={i} className="rounded-card border border-texto/10 bg-tarjeta p-4 text-sm">
                {r.respuesta}
              </li>
            ))}
          </ul>
        ) : (
          <Vacio texto="Todavía no hay ninguno." />
        )}
      </Seccion>

      <Seccion titulo="Hitos">
        {area("hito").length > 0 ? (
          <ul className="space-y-2">
            {area("hito").map((r, i) => (
              <li key={i} className="rounded-card border border-texto/10 bg-tarjeta p-4 text-sm">
                {r.respuesta}
              </li>
            ))}
          </ul>
        ) : (
          <Vacio texto="Todavía no hay hitos definidos." />
        )}
      </Seccion>

      <Seccion titulo="Movimiento de esta semana">
        {movimiento ? <Tarjeta>{movimiento.descripcion}</Tarjeta> : <Vacio texto="Todavía no elegiste uno." />}
      </Seccion>

      <Seccion titulo="Evidencias">
        {evidencias.length > 0 ? (
          <>
            <p className="text-sm text-texto/50">{evidencias.length} registradas</p>
            <ul className="space-y-2">
              {evidencias.map((ev) => (
                <li key={ev.id} className="rounded-card border border-texto/10 bg-tarjeta p-4 text-sm">
                  {ev.contenido}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Vacio texto="Todavía no hay evidencias registradas." />
        )}
      </Seccion>

      {autorizacion.nivel === "gratis" && (
        <p className="pt-4 text-center text-sm text-texto/45">
          Identidad, estándares e hitos completos se desbloquean con tu Proyecto de Valentía Premium.
        </p>
      )}
    </main>
  );
}
