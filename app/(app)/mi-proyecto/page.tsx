import { crearClienteServidor } from "@/lib/supabase/server";
import {
  obtenerAutorizacion,
  obtenerSuenoActivo,
  obtenerRespuestasPorArea,
  obtenerMovimientoActual,
  obtenerEvidencias,
  obtenerProyectoActivo,
  obtenerRuta,
} from "@/lib/datos";
import { diaDelProyecto } from "@/lib/fechas";
import { Titulo, Subtitulo } from "@/components/ui";
import { TarjetaProyecto } from "@/components/tarjetas";
import type { AreaRespuesta } from "@/lib/tipos";

const PASTELES = ["bg-acentoRosa/60", "bg-acentoCeleste/50", "bg-acento/20", "bg-acentoLima/35"];
const NOMBRES_ETAPA = ["DEFINÍ", "CONSTRUÍTE", "DISEÑÁ", "MOVETE", "SOSTENÉ"];

function Seccion({ titulo, children, color }: { titulo: string; children: React.ReactNode; color?: string }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-bold text-marca">{titulo}</h2>
      {color ? <div className={`rounded-[22px] ${color} p-4 text-[15px] leading-relaxed text-marca`}>{children}</div> : children}
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
  const esPremium = autorizacion.nivel === "premium";
  const ruta = esPremium && proyecto ? await obtenerRuta(supabase, user.id) : [];
  const etapaActual = ruta.find((e) => e.id === proyecto?.etapa_actual);
  const etapaIndice = etapaActual ? NOMBRES_ETAPA.indexOf(etapaActual.nombre) : 0;

  const area = (a: AreaRespuesta) => respuestas.get(a) ?? [];
  const ultima = (a: AreaRespuesta) => area(a).at(-1);
  const estandaresYDecisiones = [...area("estandar"), ...area("decision")].sort((a, b) =>
    a.fecha.localeCompare(b.fecha)
  );

  return (
    <main className="mx-auto max-w-md space-y-8 px-5 pb-10 pt-6">
      <div className="space-y-4">
        <div>
          <Titulo>Mi Proyecto de Valentía</Titulo>
          <Subtitulo>Se escribe solo, con lo que respondés en cada experiencia.</Subtitulo>
        </div>
        {esPremium && proyecto && (
          <TarjetaProyecto
            dia={diaDelProyecto(proyecto.fecha_inicio)}
            etapaNombre={etapaActual?.nombre}
            etapaIndice={Math.max(0, etapaIndice)}
            href="/mi-proyecto"
          />
        )}
      </div>

      <Seccion titulo="Mi sueño" color={PASTELES[0]}>
        {sueno ? sueno.descripcion : <Vacio texto="Todavía no lo declaraste." />}
      </Seccion>

      <Seccion titulo="Mi para qué" color={PASTELES[1]}>
        {sueno?.por_que_importa ?? <Vacio texto="Todavía no lo escribiste." />}
      </Seccion>

      <Seccion titulo="Mi punto de partida" color={PASTELES[2]}>
        {ultima("punto_partida")?.respuesta ?? <Vacio texto="Todavía no hay respuesta." />}
      </Seccion>

      <Seccion titulo="Resultado a los 90 días" color={PASTELES[3]}>
        {ultima("resultado_90_dias")?.respuesta ?? <Vacio texto="Se completa en la declaración de tu Proyecto." />}
      </Seccion>

      <Seccion titulo="Identidad que estoy practicando" color={PASTELES[0]}>
        {ultima("identidad")?.respuesta ?? <Vacio texto="Se completa en las experiencias de Construíte (Premium)." />}
      </Seccion>

      <Seccion titulo="Estándares y decisiones">
        {estandaresYDecisiones.length > 0 ? (
          <ul className="space-y-2">
            {estandaresYDecisiones.map((r, i) => (
              <li key={i} className={`rounded-[20px] ${PASTELES[i % PASTELES.length]} p-4 text-sm text-marca`}>
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
              <li key={i} className={`rounded-[20px] ${PASTELES[i % PASTELES.length]} p-4 text-sm text-marca`}>
                {r.respuesta}
              </li>
            ))}
          </ul>
        ) : (
          <Vacio texto="Todavía no hay hitos definidos." />
        )}
      </Seccion>

      <Seccion titulo="Movimiento de esta semana" color={PASTELES[1]}>
        {movimiento ? movimiento.descripcion : <Vacio texto="Todavía no elegiste uno." />}
      </Seccion>

      <Seccion titulo="Evidencias">
        {evidencias.length > 0 ? (
          <>
            <p className="text-sm text-texto/50">{evidencias.length} registradas</p>
            <ul className="space-y-2">
              {evidencias.map((ev, i) => (
                <li key={ev.id} className={`rounded-[20px] ${PASTELES[i % PASTELES.length]} p-4 text-sm text-marca`}>
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
