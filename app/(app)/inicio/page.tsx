import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import {
  obtenerAutorizacion,
  obtenerSuenoActivo,
  obtenerMovimientoActual,
  obtenerSemanasEnMovimiento,
  obtenerSeguimientoInicio,
  obtenerNovedadActiva,
  obtenerMeditacionSemanal,
} from "@/lib/datos";
import { Badge, Etiqueta } from "@/components/ui";
import {
  TarjetaSueno,
  TarjetaCamino,
  TarjetaContinuar,
  TarjetaNovedad,
  TarjetaCompacta,
  TarjetaMeditacionSemanal,
} from "@/components/tarjetas";
import InstalarPWA from "@/components/pwa/InstalarPWA";
import { TALLER_HACERLE_LUGAR, PROXIMO_ENCUENTRO_ABIERTO } from "@/lib/config/taller-hacerle-lugar";

function formatearFechaHoraEvento(iso: string): { fecha: string; hora: string } {
  const fecha = new Date(iso);
  const zona = "America/Argentina/Cordoba";
  return {
    fecha: fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: zona }),
    hora: fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: zona }),
  };
}

function formatearFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Argentina/Cordoba",
  });
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

  const consultaEncuentroAbierto = supabase
    .from("eventos")
    .select("id, titulo, descripcion, fecha_hora")
    .eq("estado", "publicado")
    .eq("nivel_acceso", "gratis")
    .gte("fecha_hora", new Date().toISOString())
    .order("fecha_hora", { ascending: true })
    .limit(1)
    .maybeSingle();

  const consultaCompraTaller = supabase
    .from("pagos")
    .select("id")
    .eq("usuario_id", user.id)
    .eq("concepto", TALLER_HACERLE_LUGAR.conceptoPago)
    .eq("estado", "approved")
    .limit(1)
    .maybeSingle();

  const [sueno, movimiento, semanas, seguimiento, novedad, encuentroAbiertoRes, compraTallerRes, meditacionSemanal] =
    await Promise.all([
      obtenerSuenoActivo(supabase, user.id),
      obtenerMovimientoActual(supabase, user.id),
      obtenerSemanasEnMovimiento(supabase, user.id),
      obtenerSeguimientoInicio(supabase, user.id, esPremium),
      obtenerNovedadActiva(supabase),
      consultaEncuentroAbierto,
      consultaCompraTaller,
      esPremium ? obtenerMeditacionSemanal(supabase) : Promise.resolve(null),
    ]);

  const encuentroAbierto = encuentroAbiertoRes.data;
  const tieneTaller = esPremium || Boolean(compraTallerRes.data);

  const hoy = new Date().getDay();
  const necesitaElegirMovimiento = !movimiento || movimiento.estado === "cumplido";
  const esRecordatorioViernes = hoy === 5 && movimiento && movimiento.estado === "planeado";
  const recordatorio =
    hoy === 1 && necesitaElegirMovimiento
      ? "Hoy es lunes: ¿qué movimiento vas a elegir esta semana?"
      : esRecordatorioViernes
        ? "Hoy es viernes: ¿qué pasó con tu movimiento esta semana?"
        : null;

  const fechaAbierto = encuentroAbierto
    ? formatearFechaHoraEvento(encuentroAbierto.fecha_hora)
    : { fecha: PROXIMO_ENCUENTRO_ABIERTO.fechaLabel, hora: PROXIMO_ENCUENTRO_ABIERTO.horaLabel };

  return (
    <main className="mx-auto max-w-md space-y-6 px-5 pb-6 pt-6">
      <div className="space-y-1">
        <p className="text-[15px] font-medium text-texto/60">Hola{nombre ? `, ${nombre}` : ""}</p>
        <Badge tipo={esPremium ? "membresia" : "gratis"} />
      </div>

      <div className="space-y-1">
        <p className="text-[14.5px] leading-relaxed text-texto/70">
          Este es tu espacio dentro de Valentía para darle lugar a eso que querés hacer realidad.
        </p>
        <p className="text-[14.5px] leading-relaxed text-texto/70">
          Acá podés ordenar tu sueño, elegir movimientos concretos, seguir aprendiendo y registrar lo que vas logrando.
        </p>
      </div>

      {semanas.total > 0 && (
        <p className="inline-block rounded-full bg-acentoLima/25 px-3.5 py-1.5 text-[12.5px] font-semibold text-marca">
          ✨ Llevás {semanas.total} semana{semanas.total === 1 ? "" : "s"} en movimiento
        </p>
      )}

      {recordatorio && (
        <div className="space-y-2 rounded-[20px] bg-acentoCeleste/40 px-4 py-3">
          <p className="text-[13.5px] font-medium text-marca">{recordatorio}</p>
          {esRecordatorioViernes && (
            <Link
              href="/movimiento"
              className="inline-block text-[13px] font-semibold text-marca underline decoration-marca/30 underline-offset-4"
            >
              Registrar mi movimiento →
            </Link>
          )}
        </div>
      )}

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

      {novedad && <TarjetaNovedad titulo={novedad.titulo} descripcion={novedad.descripcion} href={novedad.href} />}

      <section className="space-y-3">
        <Etiqueta>Lo que viene</Etiqueta>

        <div className="relative overflow-hidden rounded-[28px] bg-acentoRosa/55 p-5">
          <div className="absolute -right-8 -top-9 h-28 w-28 rounded-full bg-white/30" />
          <div className="relative space-y-3">
            <span className="inline-block rounded-full bg-acentoLima px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-marca">
              Encuentro abierto · Gratis
            </span>
            <p className="font-display text-[20px] font-bold leading-snug text-marca">
              {encuentroAbierto?.titulo ?? PROXIMO_ENCUENTRO_ABIERTO.titulo}
            </p>
            <p className="text-[13.5px] font-semibold text-marca">
              {fechaAbierto.fecha} · {fechaAbierto.hora} hs
            </p>
            <p className="text-[13px] leading-relaxed text-marca/70">
              {encuentroAbierto?.descripcion ?? PROXIMO_ENCUENTRO_ABIERTO.descripcion}
            </p>
            <p className="text-[12.5px] text-marca/55">Reservate la fecha. El link lo compartimos antes del encuentro.</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] bg-marca p-5 text-white">
          <div className="absolute -right-8 -top-9 h-28 w-28 rounded-full bg-white/10" />
          <div className="relative space-y-3">
            <span className="inline-block rounded-full bg-acentoLima px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-marca">
              {esPremium ? "Incluido en tu Premium" : tieneTaller ? "Ya tenés tu lugar" : "Encuentro intensivo"}
            </span>
            <p className="font-display text-[20px] font-bold leading-snug">{TALLER_HACERLE_LUGAR.titulo}</p>
            <p className="text-[13.5px] font-semibold text-white/85">
              {TALLER_HACERLE_LUGAR.fechaLabel} · {TALLER_HACERLE_LUGAR.horaLabel}
            </p>
            <p className="text-[13px] leading-relaxed text-white/70">{TALLER_HACERLE_LUGAR.bajada}</p>
            <Link
              href={tieneTaller ? TALLER_HACERLE_LUGAR.accesoPath : TALLER_HACERLE_LUGAR.landingPath}
              className="inline-flex rounded-full bg-acentoLima px-5 py-2.5 text-[13px] font-semibold text-marca"
            >
              {tieneTaller ? "Ver mi acceso →" : "Ver encuentro y opciones →"}
            </Link>
          </div>
        </div>
      </section>

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
