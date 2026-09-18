import { crearClienteServidor } from "@/lib/supabase/server";
import {
  obtenerAutorizacion,
  obtenerSuenoActivo,
  obtenerMovimientoActual,
  obtenerSemanasEnMovimiento,
  obtenerSeguimientoInicio,
  obtenerNovedadActiva,
  obtenerProximoEventoPremium,
  obtenerMeditacionSemanal,
} from "@/lib/datos";
import { Badge } from "@/components/ui";
import {
  TarjetaSueno,
  TarjetaCamino,
  TarjetaContinuar,
  TarjetaNovedad,
  TarjetaCompacta,
  TarjetaProximoEncuentro,
  TarjetaMeditacionSemanal,
} from "@/components/tarjetas";
import InstalarPWA from "@/components/pwa/InstalarPWA";

// "[fecha] · [hora]" para la tarjeta de Próximo encuentro.
function formatearFechaHoraEvento(iso: string): { fecha: string; hora: string } {
  const fecha = new Date(iso);
  return {
    fecha: fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long" }),
    hora: fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
  };
}

// "Disponible el XX/XX" para la meditación de la semana todavía bloqueada.
function formatearFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

export default async function InicioPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const nombre = (user.user_metadata?.nombre as string | undefined) ?? "";
  const autorizacion = await obtenerAutorizacion(supabase, user.id);
  const esPremium = autorizacion.nivel === "premium";

  const [sueno, movimiento, semanas, seguimiento, novedad, proximoEncuentro, meditacionSemanal] = await Promise.all([
    obtenerSuenoActivo(supabase, user.id),
    obtenerMovimientoActual(supabase, user.id),
    obtenerSemanasEnMovimiento(supabase, user.id),
    obtenerSeguimientoInicio(supabase, user.id, esPremium),
    obtenerNovedadActiva(supabase),
    // Solo Premium: ni siquiera se consulta para una cuenta Gratis (RLS
    // igual lo protegería, ver obtenerProximoEventoPremium, pero así no
    // se gasta la consulta en la inmensa mayoría de las cuentas).
    esPremium ? obtenerProximoEventoPremium(supabase) : Promise.resolve(null),
    esPremium ? obtenerMeditacionSemanal(supabase) : Promise.resolve(null),
  ]);

  // Ritual semanal, adentro de la app (no hay infraestructura de push
  // todavía — ver NOTIFICACIONES.md). El día de la semana es el del
  // servidor; es un recordatorio suave, no algo crítico.
  const hoy = new Date().getDay();
  const necesitaElegirMovimiento = !movimiento || movimiento.estado === "cumplido";
  const recordatorio =
    hoy === 1 && necesitaElegirMovimiento
      ? "Hoy es lunes: ¿qué movimiento vas a elegir esta semana?"
      : hoy === 5 && movimiento && movimiento.estado === "planeado"
        ? "Hoy es viernes: ¿qué pasó con tu movimiento esta semana?"
        : null;

  return (
    <main className="mx-auto max-w-md space-y-6 px-5 pb-6 pt-6">
      <div className="space-y-1">
        <p className="text-[15px] font-medium text-texto/60">Hola{nombre ? `, ${nombre}` : ""}</p>
        <Badge tipo={esPremium ? "membresia" : "gratis"} />
      </div>

      {/* La explicación que pidió el brief: qué es este espacio, en dos
          líneas cortas — no un bloque grande. */}
      <div className="space-y-1">
        <p className="text-[14.5px] leading-relaxed text-texto/70">
          Este es tu espacio dentro de Valentía para darle lugar a eso que querés hacer realidad.
        </p>
        <p className="text-[14.5px] leading-relaxed text-texto/70">
          Acá podés ordenar tu sueño, elegir movimientos concretos, seguir aprendiendo y registrar lo que vas
          logrando.
        </p>
      </div>

      {semanas.total > 0 && (
        <p className="inline-block rounded-full bg-acentoLima/25 px-3.5 py-1.5 text-[12.5px] font-semibold text-marca">
          ✨ Llevás {semanas.total} semana{semanas.total === 1 ? "" : "s"} en movimiento
        </p>
      )}

      {recordatorio && (
        <div className="rounded-[20px] bg-acentoCeleste/40 px-4 py-3">
          <p className="text-[13.5px] font-medium text-marca">{recordatorio}</p>
        </div>
      )}

      {/* CTA principal: entra directo a la experiencia exacta, sin pasar
          por Mi Ruta ni por buscar en qué quedó. Gratis y Premium
          comparten el mismo bloque y el mismo criterio (ver
          obtenerSeguimientoInicio en lib/datos.ts). Si ya completó todo
          lo disponible, no se inventa una siguiente experiencia: el
          bloque simplemente no aparece. */}
      {seguimiento && (
        <TarjetaContinuar
          contexto={
            seguimiento.esRecorridoEntrada
              ? `Mi Sueño · Paso ${seguimiento.posicionRecorrido} de ${seguimiento.totalRecorrido}`
              : [seguimiento.etapaNombre, seguimiento.moduloTitulo].filter(Boolean).join(" · ")
          }
          titulo={seguimiento.titulo}
          tipo={seguimiento.tipo === "meditacion" ? "meditacion" : "clase"}
          duracion={seguimiento.duracion}
          href={`/experiencias/${seguimiento.id}`}
        />
      )}

      {novedad && (
        <TarjetaNovedad titulo={novedad.titulo} descripcion={novedad.descripcion} href={novedad.href} />
      )}

      {/* El ritmo de Premium: el encuentro en vivo mensual y la
          meditación de la semana. Si todavía no hay un evento cargado, o
          ninguna meditación marcada como semanal, no se inventa nada acá
          — el bloque correspondiente simplemente no aparece. */}
      {proximoEncuentro && (
        <TarjetaProximoEncuentro
          {...formatearFechaHoraEvento(proximoEncuentro.fecha_hora)}
          titulo={proximoEncuentro.titulo}
          href={proximoEncuentro.link_externo}
        />
      )}

      {meditacionSemanal && (
        <TarjetaMeditacionSemanal
          titulo={meditacionSemanal.titulo}
          disponible={meditacionSemanal.disponible}
          fechaDisponible={meditacionSemanal.disponibleDesde ? formatearFechaCorta(meditacionSemanal.disponibleDesde) : null}
          href={`/biblioteca/${meditacionSemanal.id}`}
        />
      )}

      {sueno && <TarjetaSueno descripcion={sueno.descripcion} href="/mi-sueno" cta="Ver / editar" />}

      <TarjetaCamino
        eyebrow="Movimiento de la semana"
        texto="Elegí algo concreto que vas a hacer esta semana. Después volvés para registrar qué pasó y reconocer ese movimiento."
        nota={movimiento?.descripcion}
        cta={movimiento ? "Ver mi movimiento" : "Elegir mi movimiento"}
        href="/movimiento"
        color="celeste"
        icono="pasos"
      />

      <div className="grid grid-cols-2 gap-3">
        <TarjetaCompacta titulo="📚 Biblioteca" cta="Explorar" href="/biblioteca" color="lima" icono="libro" />
        <TarjetaCompacta titulo="👥 Comunidad" cta="Entrar" href="/comunidad" color="lila" icono="gente" />
      </div>

      <InstalarPWA />
    </main>
  );
}
