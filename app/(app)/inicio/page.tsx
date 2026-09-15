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
} from "@/lib/datos";
import { diasDesde, diaDelProyecto } from "@/lib/fechas";
import { Badge, Tarjeta, EnlacePrimario, Titulo, Subtitulo } from "@/components/ui";

export default async function InicioPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const nombre = (user.user_metadata?.nombre as string | undefined) ?? "";
  const [autorizacion, sueno, recorrido, movimiento] = await Promise.all([
    obtenerAutorizacion(supabase, user.id),
    obtenerSuenoActivo(supabase, user.id),
    obtenerRecorridoEntrada(supabase, user.id),
    obtenerMovimientoActual(supabase, user.id),
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
    <main className="mx-auto max-w-md space-y-6 px-6 pt-10">
      <div className="flex items-center justify-between">
        <Titulo>Hola{nombre ? `, ${nombre}` : ""}</Titulo>
        <Badge tipo={esPremium ? "membresia" : "gratis"} />
      </div>

      {!sueno && (
        <Tarjeta className="space-y-3">
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
          <Link href="/mi-sueno" className="inline-block pt-1 text-sm font-medium text-acento">
            Ver mi ruta →
          </Link>
        </Tarjeta>
      )}

      {sueno && !recorridoTerminado && (
        <Tarjeta className="space-y-3">
          <Badge tipo="gratis" />
          <p className="font-medium">Tomate tus sueños en serio</p>
          <p className="text-sm text-texto/55">
            {recorrido.filter((e) => e.completada).length} de {recorrido.length} clases hechas
          </p>
          <EnlacePrimario href={siguiente ? `/experiencias/${siguiente.id}` : "/mi-sueno"}>
            Seguir el recorrido
          </EnlacePrimario>
        </Tarjeta>
      )}

      {sueno && recorridoTerminado && !esPremium && (
        <Tarjeta className="space-y-3 border-acento/40 bg-acento/5">
          <p className="text-xs uppercase tracking-wide text-acentoTeal">El próximo paso</p>
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
        <Tarjeta className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-texto/45">Tu Proyecto de Valentía</p>
          <p className="text-[17px] font-medium leading-snug">
            Día {diaDelProyecto(proyecto.fecha_inicio)} de 90{etapaActual ? ` · ${etapaActual.nombre}` : ""}
          </p>
          <Link href="/mi-proyecto" className="inline-block pt-1 text-sm font-medium text-acento">
            Ver mi Proyecto →
          </Link>
        </Tarjeta>
      )}

      {sueno && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Tu movimiento de esta semana</h2>
          {movimiento ? (
            <Tarjeta className="space-y-1">
              <p className="text-[15px]">{movimiento.descripcion}</p>
              <p className="text-xs text-texto/45">
                {movimiento.estado === "cumplido" ? "Ya registraste evidencia" : "El viernes te recordamos registrar qué pasó."}
              </p>
            </Tarjeta>
          ) : (
            <Tarjeta className="space-y-2">
              <Subtitulo>Todavía no elegiste tu movimiento de esta semana.</Subtitulo>
            </Tarjeta>
          )}
          <Link href="/movimiento" className="inline-block text-sm font-medium text-acento">
            Ir a mi ritual semanal →
          </Link>
        </section>
      )}

      <section className="space-y-2 pb-6">
        <h2 className="font-display text-lg font-semibold">Comunidad</h2>
        <Tarjeta>
          <Subtitulo>Presentaciones, preguntas y evidencias de la semana.</Subtitulo>
          <Link href="/comunidad" className="mt-2 inline-block text-sm font-medium text-acento">
            Entrar a Comunidad →
          </Link>
        </Tarjeta>
      </section>
    </main>
  );
}
