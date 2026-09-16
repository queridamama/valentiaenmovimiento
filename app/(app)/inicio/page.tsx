import { crearClienteServidor } from "@/lib/supabase/server";
import {
  obtenerAutorizacion,
  obtenerSuenoActivo,
  obtenerRecorridoEntrada,
  obtenerMovimientoActual,
  obtenerSemanasEnMovimiento,
} from "@/lib/datos";
import { Badge, Etiqueta } from "@/components/ui";
import { TarjetaSueno, TarjetaCamino } from "@/components/tarjetas";

export default async function InicioPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const nombre = (user.user_metadata?.nombre as string | undefined) ?? "";
  const [autorizacion, sueno, recorrido, movimiento, semanas] = await Promise.all([
    obtenerAutorizacion(supabase, user.id),
    obtenerSuenoActivo(supabase, user.id),
    obtenerRecorridoEntrada(supabase, user.id),
    obtenerMovimientoActual(supabase, user.id),
    obtenerSemanasEnMovimiento(supabase, user.id),
  ]);

  const esPremium = autorizacion.nivel === "premium";
  const recorridoTerminado = recorrido.length > 0 && recorrido.every((e) => e.completada);
  const siguiente = recorrido.find((e) => !e.completada);

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

      {sueno && <TarjetaSueno descripcion={sueno.descripcion} href="/mi-sueno" cta="Ver mi ruta" />}

      <div className="space-y-4">
        <Etiqueta className="!text-texto/40">Dentro de Valentía podés</Etiqueta>

        <TarjetaCamino
          eyebrow="Mi Ruta"
          texto="Empezá por acá. Un recorrido corto para poner en palabras qué querés, por qué importa y desde dónde estás empezando."
          nota={
            recorrido.length === 0
              ? undefined
              : recorridoTerminado
                ? "Recorrido completado ✓"
                : `${recorrido.filter((e) => e.completada).length} de ${recorrido.length} clases hechas`
          }
          cta={recorridoTerminado ? "Ver mi Ruta" : "Continuar mi Ruta"}
          href={siguiente ? `/experiencias/${siguiente.id}` : "/mi-sueno"}
          color="rosa"
          icono="estrella"
        />

        <TarjetaCamino
          eyebrow="Movimiento de la semana"
          texto="Elegí algo concreto que vas a hacer esta semana. Después volvés para registrar qué pasó y reconocer ese movimiento."
          nota={movimiento?.descripcion}
          cta={movimiento ? "Ver mi movimiento" : "Elegir mi movimiento"}
          href="/movimiento"
          color="celeste"
          icono="pasos"
        />

        <TarjetaCamino
          eyebrow="Biblioteca"
          texto="Videos, meditaciones y recursos para seguir trabajando en vos y en eso que querés construir."
          cta="Explorar la Biblioteca"
          href="/biblioteca"
          color="lima"
          icono="libro"
        />

        <TarjetaCamino
          eyebrow="Comunidad"
          texto="Un espacio para compartir lo que vas viviendo y encontrarte con otras mujeres que también están poniendo algo en movimiento."
          cta="Entrar a la Comunidad"
          href="/comunidad"
          color="lila"
          icono="gente"
        />
      </div>
    </main>
  );
}
