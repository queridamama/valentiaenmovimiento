import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import {
  obtenerAutorizacion,
  obtenerSuenoActivo,
  obtenerRecorridoEntrada,
  obtenerMovimientoActual,
  obtenerProyectoActivo,
  asegurarProyectoActivo,
  obtenerRuta,
  obtenerConfiguracionHome,
} from "@/lib/datos";
import { diasDesde, diaDelProyecto } from "@/lib/fechas";
import { Badge, Tarjeta, EnlacePrimario, Subtitulo, Marcador } from "@/components/ui";

export default async function InicioPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const nombre = (user.user_metadata?.nombre as string | undefined) ?? "";
  const [autorizacion, sueno, recorrido, movimiento, hero] = await Promise.all([
    obtenerAutorizacion(supabase, user.id),
    obtenerSuenoActivo(supabase, user.id),
    obtenerRecorridoEntrada(supabase, user.id),
    obtenerMovimientoActual(supabase, user.id),
    obtenerConfiguracionHome(supabase),
  ]);

  const esPremium = autorizacion.nivel === "premium";
  const recorridoTerminado = recorrido.length > 0 && recorrido.every((e) => e.completada);
  const siguiente = recorrido.find((e) => !e.completada);

  let proyecto = esPremium ? await obtenerProyectoActivo(supabase, user.id) : null;
  if (esPremium && !proyecto) {
    proyecto = await asegurarProyectoActivo(supabase, user.id, sueno?.id ?? null);
  }
  const ruta = esPremium ? await obtenerRuta(supabase, user.id) : [];
  const etapaActual = ruta.find((e) => e.id === proyecto?.etapa_actual);

  return (
    <main className="mx-auto max-w-md">
      {/* Hero editorial: imagen + eyebrow/título administrables desde
          /admin/inicio (ver lib/datos.ts:obtenerConfiguracionHome). `main`
          no tiene padding lateral a propósito: esta imagen sangra hasta
          los bordes del "teléfono" — el resto del contenido recupera el
          padding en el div de abajo. */}
      <div className="relative aspect-[16/11] w-full overflow-hidden">
        {hero.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- viene de Storage
          <img src={hero.imagen_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-acento/50 via-acentoRosa/60 to-acentoCeleste/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-texto/80 via-texto/10 to-transparent" />
        <div className="absolute inset-x-6 bottom-5 space-y-1.5">
          {hero.eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85">{hero.eyebrow}</p>
          )}
          {hero.titulo && (
            <p className="font-display text-[26px] font-semibold leading-tight text-white">{hero.titulo}</p>
          )}
        </div>
      </div>

      <div className="space-y-6 px-6 pb-6 pt-6">
        {hero.bajada && <Subtitulo>{hero.bajada}</Subtitulo>}

        <div className="flex items-center justify-between">
          <p className="text-[15px] font-medium text-texto/70">Hola{nombre ? `, ${nombre}` : ""}</p>
          <Badge tipo={esPremium ? "membresia" : "gratis"} />
        </div>

        {!sueno && (
        <Tarjeta variante="destacada" className="space-y-3">
          <Subtitulo>Todavía no empezaste tu recorrido. Son tres clases cortas y termina con tu sueño declarado.</Subtitulo>
          <EnlacePrimario href={siguiente ? `/experiencias/${siguiente.id}` : "/mi-sueno"}>
            Empezar Mi Sueño
          </EnlacePrimario>
        </Tarjeta>
      )}

      {sueno && (
        <Tarjeta className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-texto/45">Tu sueño</p>
          <p className="text-[17px] font-medium leading-snug">{sueno.descripcion}</p>
          <p className="text-xs text-texto/45">Declarado hace {diasDesde(sueno.fecha_creado)} días</p>
          <Link href="/mi-sueno" className="inline-block pt-1 text-sm font-medium text-marca">
            Ver mi ruta →
          </Link>
        </Tarjeta>
      )}

      {sueno && !recorridoTerminado && (
        <Tarjeta className="space-y-3">
          <Badge tipo="gratis" />
          <p className="font-medium">
            Tomate tus sueños <Marcador>en serio</Marcador>
          </p>
          <p className="text-sm text-texto/55">
            {recorrido.filter((e) => e.completada).length} de {recorrido.length} clases hechas
          </p>
          <EnlacePrimario href={siguiente ? `/experiencias/${siguiente.id}` : "/mi-sueno"}>
            Seguir el recorrido
          </EnlacePrimario>
        </Tarjeta>
      )}

      {sueno && recorridoTerminado && !esPremium && (
        <Tarjeta variante="destacada" className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-marca">El próximo paso</p>
          <p className="text-[17px] font-medium leading-snug">
            Ya elegiste el sueño. Ahora convertilo en un Proyecto de Valentía.
          </p>
          <Subtitulo>
            Noventa días con método, ruta completa, hitos y revisiones. Con acompañamiento de Melisa y la comunidad.
          </Subtitulo>
          <EnlacePrimario href="/membresia">Empezar mis 90 días</EnlacePrimario>
        </Tarjeta>
      )}

      {esPremium && proyecto && (
        <Tarjeta variante="destacada" className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-marca">Tu Proyecto de Valentía</p>
          <p className="text-[17px] font-medium leading-snug">
            Día {diaDelProyecto(proyecto.fecha_inicio)} de 90{etapaActual ? ` · ${etapaActual.nombre}` : ""}
          </p>
          <Link href="/mi-proyecto" className="inline-block pt-1 text-sm font-medium text-marca">
            Ver mi Proyecto →
          </Link>
        </Tarjeta>
      )}

      {sueno && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-marca">Tu movimiento de esta semana</h2>
          {movimiento ? (
            <Tarjeta variante="suave" className="space-y-1">
              <p className="text-[15px]">{movimiento.descripcion}</p>
              <p className="text-xs text-texto/45">
                {movimiento.estado === "cumplido" ? "Ya registraste evidencia" : "El viernes te recordamos registrar qué pasó."}
              </p>
            </Tarjeta>
          ) : (
            <Tarjeta variante="suave" className="space-y-2">
              <Subtitulo>Todavía no elegiste tu movimiento de esta semana.</Subtitulo>
            </Tarjeta>
          )}
          <Link href="/movimiento" className="inline-block text-sm font-medium text-marca">
            Ir a mi ritual semanal →
          </Link>
        </section>
      )}

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-marca">Comunidad</h2>
          <Tarjeta variante="suave">
            <Subtitulo>Presentaciones, preguntas y evidencias de la semana.</Subtitulo>
            <Link href="/comunidad" className="mt-2 inline-block text-sm font-medium text-marca">
              Entrar a Comunidad →
            </Link>
          </Tarjeta>
        </section>
      </div>
    </main>
  );
}
