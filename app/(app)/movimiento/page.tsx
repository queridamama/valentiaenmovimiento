import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerMovimientoActual, obtenerEvidencias, obtenerSemanasEnMovimiento } from "@/lib/datos";
import { marcarMovimientoRealizado, registrarEvidencia, alternarCompartirEvidencia } from "@/lib/acciones/movimiento";
import { BotonPrimario, BotonSecundario, Titulo, Subtitulo, Etiqueta, Campo } from "@/components/ui";
import { IconoPastel } from "@/components/iconos";
import { TarjetaEvidencia, COLORES_PASO } from "@/components/tarjetas";
import type { TipoIcono } from "@/components/iconos";
import FormularioMovimiento from "@/components/FormularioMovimiento";

const ICONOS_EVIDENCIA: TipoIcono[] = ["chat", "corazon", "estrella", "documento"];

export default async function MovimientoPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [movimiento, evidencias, semanas] = await Promise.all([
    obtenerMovimientoActual(supabase, user.id),
    obtenerEvidencias(supabase, user.id),
    obtenerSemanasEnMovimiento(supabase, user.id),
  ]);

  const enCurso = movimiento && movimiento.estado === "planeado";
  const cumplido = movimiento && movimiento.estado === "cumplido";
  const marcarRealizado = movimiento ? marcarMovimientoRealizado.bind(null, movimiento.id) : undefined;
  const registrar = movimiento ? registrarEvidencia.bind(null, movimiento.id) : undefined;

  // Riel de 3 momentos reales: elegís, te movés, registrás. Nada de
  // calendario semanal ni tracker diario — nuestra unidad real es UN
  // movimiento por semana.
  const paso = !movimiento ? 0 : movimiento.estado === "cumplido" ? 2 : 1;
  const MOMENTOS = ["Elegís", "Te movés", "Registrás"];

  return (
    <main className="mx-auto max-w-md space-y-7 px-5 pb-6 pt-6">
      <div className="space-y-2">
        <Titulo>Tu semana, en dos momentos</Titulo>
        <Subtitulo>Elegí un movimiento, después contá qué pasó.</Subtitulo>
      </div>

      {cumplido && (
        <p className="rounded-[20px] bg-acentoLima/25 px-4 py-3 text-[13.5px] font-medium text-marca">
          ✨ Esta semana te pusiste en movimiento.
        </p>
      )}

      {semanas.esteMes > 0 && (
        <p className="text-[12.5px] text-texto/45">
          Este mes registraste {semanas.esteMes} movimiento{semanas.esteMes === 1 ? "" : "s"}.
        </p>
      )}

      <div className="flex items-center justify-center gap-1.5">
        {MOMENTOS.map((m, i) => (
          <div key={m} className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                i <= paso ? "bg-marca text-white" : "bg-texto/8 text-texto/40"
              }`}
            >
              {m}
            </span>
            {i < MOMENTOS.length - 1 && <span className="text-texto/25">→</span>}
          </div>
        ))}
      </div>

      <section className="space-y-4 rounded-[28px] bg-acentoCeleste/50 p-6">
        <div className="flex items-start justify-between gap-3">
          <Etiqueta>{enCurso ? "Editar tu movimiento" : "Elegí tu movimiento de la semana"}</Etiqueta>
          <IconoPastel tipo="pasos" color="blanco" />
        </div>
        {!enCurso && (
          <p className="text-[14px] leading-relaxed text-marca/70">
            Uno solo. Que se pueda hacer en siete días y que te dé un poco de miedo.
          </p>
        )}
        <FormularioMovimiento descripcionInicial={movimiento?.descripcion ?? ""} enCurso={Boolean(enCurso)} />
      </section>

      {enCurso && (
        <>
          <form action={marcarRealizado}>
            <BotonSecundario type="submit">Marcar como realizado (sin evidencia)</BotonSecundario>
          </form>

          <section className="space-y-4 rounded-[28px] bg-acentoRosa/60 p-6">
            <div className="flex items-start justify-between gap-3">
              <Etiqueta>Registrá tu evidencia</Etiqueta>
              <IconoPastel tipo="documento" color="blanco" />
            </div>
            <p className="text-[14px] leading-relaxed text-marca/70">
              Algo que pasó porque te moviste. Aunque haya salido distinto a lo que esperabas.
            </p>
            <div className="rounded-2xl bg-white/70 p-3">
              <p className="text-xs text-marca/50">Tu movimiento fue</p>
              <p className="text-[14px] text-marca">{movimiento?.descripcion}</p>
            </div>
            <form action={registrar} className="space-y-3">
              <Campo label="" name="contenido" placeholder="Contá qué hiciste" rows={3} required />
              <BotonPrimario type="submit">Registrar evidencia</BotonPrimario>
            </form>
          </section>
        </>
      )}

      {evidencias.length > 0 && (
        <section className="space-y-3 pb-2">
          <div className="flex items-baseline justify-between">
            <Etiqueta>Tu recorrido</Etiqueta>
            <span className="text-xs text-texto/45">{evidencias.length} registradas</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {evidencias.map((ev, i) => (
              <TarjetaEvidencia
                key={ev.id}
                contenido={ev.contenido}
                fecha={new Date(ev.fecha_creado).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                color={COLORES_PASO[i % COLORES_PASO.length]}
                icono={ICONOS_EVIDENCIA[i % ICONOS_EVIDENCIA.length]}
                compartida={ev.compartida_en_comunidad}
                accionCompartir={alternarCompartirEvidencia.bind(null, ev.id)}
              />
            ))}
          </div>
        </section>
      )}

      <Link href="/mi-proyecto" className="block text-center text-sm font-medium text-marca">
        Ver mi Proyecto →
      </Link>
    </main>
  );
}
