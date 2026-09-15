import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerMovimientoActual, obtenerEvidencias } from "@/lib/datos";
import { marcarMovimientoRealizado, registrarEvidencia, alternarCompartirEvidencia } from "@/lib/acciones/movimiento";
import { BotonPrimario, BotonSecundario, Tarjeta, Titulo, Subtitulo, Campo } from "@/components/ui";
import FormularioMovimiento from "@/components/FormularioMovimiento";

export default async function MovimientoPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [movimiento, evidencias] = await Promise.all([
    obtenerMovimientoActual(supabase, user.id),
    obtenerEvidencias(supabase, user.id),
  ]);

  const enCurso = movimiento && movimiento.estado === "planeado";
  const marcarRealizado = movimiento ? marcarMovimientoRealizado.bind(null, movimiento.id) : undefined;
  const registrar = movimiento ? registrarEvidencia.bind(null, movimiento.id) : undefined;

  return (
    <main className="mx-auto max-w-md space-y-8 px-6 pt-10 pb-6">
      <div className="space-y-2">
        <Titulo>Tu semana, en dos momentos</Titulo>
        <Subtitulo>Elegí un movimiento, después contá qué pasó.</Subtitulo>
      </div>

      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-texto/45">
          {enCurso ? "Editar tu movimiento" : "Elegí tu movimiento de la semana"}
        </p>
        {!enCurso && (
          <Subtitulo>Uno solo. Que se pueda hacer en siete días y que te dé un poco de miedo.</Subtitulo>
        )}
        <FormularioMovimiento descripcionInicial={movimiento?.descripcion ?? ""} enCurso={Boolean(enCurso)} />
      </section>

      {enCurso && (
        <>
          <form action={marcarRealizado}>
            <BotonSecundario type="submit">Marcar como realizado (sin evidencia)</BotonSecundario>
          </form>

          <section className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-texto/45">Registrá tu evidencia</p>
            <Subtitulo>Algo que pasó porque te moviste. Aunque haya salido distinto a lo que esperabas.</Subtitulo>
            <Tarjeta>
              <p className="text-xs text-texto/45">Tu movimiento fue</p>
              <p className="text-[15px]">{movimiento?.descripcion}</p>
            </Tarjeta>
            <form action={registrar} className="space-y-3">
              <Campo label="Qué pasó" name="contenido" placeholder="Contá qué hiciste" rows={3} required />
              <BotonPrimario type="submit">Registrar evidencia</BotonPrimario>
            </form>
          </section>
        </>
      )}

      {evidencias.length > 0 && (
        <section className="space-y-3 pb-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-texto/45">Tu recorrido</p>
          <ul className="space-y-2">
            {evidencias.map((ev) => {
              const compartir = alternarCompartirEvidencia.bind(null, ev.id);
              return (
                <li key={ev.id} className="rounded-card border border-texto/10 bg-tarjeta p-4 text-sm">
                  <p>{ev.contenido}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-texto/40">
                      {new Date(ev.fecha_creado).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </span>
                    <form action={compartir}>
                      <button type="submit" className="text-xs font-medium text-acento">
                        {ev.compartida_en_comunidad ? "Compartida con la comunidad ✓" : "Compartir con la comunidad"}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Link href="/mi-proyecto" className="block text-center text-sm font-medium text-acento">
        Ver mi Proyecto →
      </Link>
    </main>
  );
}
