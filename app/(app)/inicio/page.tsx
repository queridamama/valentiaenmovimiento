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
import { diaDelProyecto } from "@/lib/fechas";
import { Badge, Etiqueta, NotaManuscrita, FormaDecorativa } from "@/components/ui";
import { TarjetaSueno, TarjetaInvitacion, TarjetaMovimiento, TarjetaComunidad, TarjetaProyecto } from "@/components/tarjetas";

const NOMBRES_ETAPA = ["DEFINÍ", "CONSTRUÍTE", "DISEÑÁ", "MOVETE", "SOSTENÉ"];

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
  const etapaIndice = etapaActual ? NOMBRES_ETAPA.indexOf(etapaActual.nombre) : 0;

  return (
    <main className="mx-auto max-w-md space-y-7 px-5 pb-6 pt-6">
      {/* Cabecera editorial: eyebrow + título grande (contenido
          administrable desde /admin/inicio), en vez del banner rectangular
          de punta a punta que había antes. La foto, si existe, vive como un
          detalle circular al costado — nunca ocupa todo el ancho. */}
      <section className="relative space-y-3">
        {hero.imagen_url && (
          <FormaDecorativa color="celeste" className="right-0 top-0 h-24 w-24 rotate-6" />
        )}
        <p className="text-[15px] font-medium text-texto/60">
          Hola{nombre ? `, ` : ""}
          {nombre && <span className="font-script text-xl text-marca">{nombre}</span>}
        </p>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            {hero.eyebrow && <Etiqueta>{hero.eyebrow}</Etiqueta>}
            {hero.titulo && (
              <h1 className="font-display text-[30px] font-bold leading-[1.05] text-marca">{hero.titulo}</h1>
            )}
          </div>
          {hero.imagen_url && (
            // eslint-disable-next-line @next/next/no-img-element -- viene de Storage
            <img
              src={hero.imagen_url}
              alt=""
              className="relative h-20 w-20 shrink-0 rounded-full border-4 border-fondo object-cover shadow-md"
            />
          )}
        </div>
        {hero.bajada && (
          <NotaManuscrita color="celeste" className="max-w-[85%]">
            {hero.bajada}
          </NotaManuscrita>
        )}
        <div>
          <Badge tipo={esPremium ? "membresia" : "gratis"} />
        </div>
      </section>

      {!sueno && (
        <TarjetaInvitacion
          eyebrow="Empezar"
          texto="Todavía no empezaste tu recorrido."
          subtexto="Son tres clases cortas y termina con tu sueño declarado."
          cta="Empezar Mi Sueño"
          href={siguiente ? `/experiencias/${siguiente.id}` : "/mi-sueno"}
          color="rosa"
          icono="estrella"
        />
      )}

      {sueno && (
        <TarjetaSueno descripcion={sueno.descripcion} href="/mi-sueno" cta="Ver mi ruta" />
      )}

      {sueno && !recorridoTerminado && (
        <TarjetaInvitacion
          eyebrow="Tu recorrido"
          texto="Tomate tus sueños en serio"
          subtexto={`${recorrido.filter((e) => e.completada).length} de ${recorrido.length} clases hechas`}
          cta="Seguir el recorrido"
          href={siguiente ? `/experiencias/${siguiente.id}` : "/mi-sueno"}
          color="lima"
          icono="pasos"
        />
      )}

      {sueno && recorridoTerminado && !esPremium && (
        <TarjetaInvitacion
          eyebrow="El próximo paso"
          texto="Ya elegiste el sueño. Ahora convertilo en un Proyecto de Valentía."
          subtexto="Noventa días con método, ruta completa, hitos y revisiones."
          cta="Empezar mis 90 días"
          href="/membresia"
          color="lila"
          icono="corona"
        />
      )}

      {esPremium && proyecto && (
        <TarjetaProyecto
          dia={diaDelProyecto(proyecto.fecha_inicio)}
          etapaNombre={etapaActual?.nombre}
          etapaIndice={Math.max(0, etapaIndice)}
          href="/mi-proyecto"
        />
      )}

      <div className={`grid gap-4 ${sueno ? "grid-cols-2" : "grid-cols-1"}`}>
        {sueno && (
          <TarjetaMovimiento
            descripcion={movimiento?.descripcion ?? null}
            nota={
              movimiento
                ? movimiento.estado === "cumplido"
                  ? "Ya registraste evidencia"
                  : "El viernes te recordamos registrar qué pasó."
                : undefined
            }
            href="/movimiento"
            cta="Ir a mi ritual"
          />
        )}
        <TarjetaComunidad
          texto="Presentaciones, preguntas y evidencias de la semana."
          href="/comunidad"
          cta="Entrar"
        />
      </div>
    </main>
  );
}
