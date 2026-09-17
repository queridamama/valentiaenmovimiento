import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerExperienciaConPreguntas, estaCompletada, obtenerSiguienteExperiencia } from "@/lib/datos";
import { guardarRespuestas } from "@/lib/acciones/experiencias";
import { Badge, BotonPrimario, Titulo, Subtitulo, Etiqueta } from "@/components/ui";
import ReproductorVideo from "@/components/ReproductorVideo";

export default async function ExperienciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const datos = await obtenerExperienciaConPreguntas(supabase, id, user.id);

  if (!datos) {
    return (
      <main className="mx-auto max-w-md space-y-4 px-6 py-10 text-center">
        <Titulo>Esta experiencia no está disponible</Titulo>
        <Subtitulo>Puede estar en borrador, archivada, o requerir Membresía.</Subtitulo>
        <Link href="/mi-sueno" className="inline-block text-sm font-medium text-marca">
          ← Volver a mi ruta
        </Link>
      </main>
    );
  }

  const { experiencia, preguntas } = datos;
  const completada = await estaCompletada(supabase, user.id, experiencia.id);
  const siguiente = completada
    ? await obtenerSiguienteExperiencia(supabase, experiencia.etapa_id, experiencia.orden)
    : null;

  const esPremium = experiencia.nivel_acceso === "membresia";
  const guardar = guardarRespuestas.bind(null, experiencia.id);
  const tieneTexto = Boolean((experiencia.texto_intro ?? "").trim());

  return (
    <main className="mx-auto max-w-md pb-10">
      {experiencia.portada_url && (
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- viene de Storage */}
          <img src={experiencia.portada_url} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-texto/50 via-transparent to-transparent" />
          <div className="absolute left-6 top-5">
            <Link
              href="/mi-sueno"
              className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-texto backdrop-blur"
            >
              ← Atrás
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-8 px-6 pt-6">
        {!experiencia.portada_url && (
          <Link href="/mi-sueno" className="text-sm text-texto/50">
            ← Atrás
          </Link>
        )}

        <div className="space-y-2.5">
          <Badge tipo={esPremium ? "membresia" : "gratis"} />
          <Titulo>{experiencia.titulo}</Titulo>
          {experiencia.descripcion && <Subtitulo>{experiencia.descripcion}</Subtitulo>}
        </div>

        {experiencia.video_url ? (
          <ReproductorVideo url={experiencia.video_url} />
        ) : experiencia.audio_url ? (
          <audio src={experiencia.audio_url} controls className="w-full" />
        ) : (
          tieneTexto && (
            <div className="rounded-card border border-dashed border-texto/15 bg-tarjeta p-5 text-sm text-texto/40">
              {experiencia.tipo === "meditacion"
                ? "Todavía no hay audio para esta meditación — podés seguir con el texto."
                : "Todavía no hay video para esta clase — podés seguir con el texto."}
            </div>
          )
        )}

        {tieneTexto && (
          <div className="contenido-enriquecido" dangerouslySetInnerHTML={{ __html: experiencia.texto_intro ?? "" }} />
        )}

        {completada && (
          <div className="rounded-card border border-acentoLima/50 bg-acentoLima/10 p-4">
            <p className="text-sm font-medium">
              ✓ {esPremium ? "Esto ya forma parte de tu Proyecto de Valentía." : "Completada — ya es parte de tu recorrido."}
            </p>
          </div>
        )}

        {preguntas.length > 0 ? (
          <form action={guardar} className="space-y-6 rounded-[28px] bg-acentoRosa/35 p-6">
            <div className="space-y-1">
              <Etiqueta>Tu turno</Etiqueta>
              <p className="text-sm text-marca/60">Nadie más lee esto. Es para vos.</p>
            </div>
            <div className="space-y-5">
              {preguntas.map((p) => (
                <label key={p.id} className="flex flex-col gap-2">
                  <span className="text-[15px] font-medium text-texto">{p.texto}</span>
                  <textarea
                    name={`pregunta_${p.id}`}
                    defaultValue={p.respuestaActual}
                    placeholder={p.placeholder ?? ""}
                    rows={3}
                    required
                    className="rounded-[18px] border-0 bg-white px-4 py-3 text-[15px] leading-relaxed placeholder:text-texto/35 focus:outline-none focus:ring-2 focus:ring-marca/40"
                  />
                </label>
              ))}
            </div>
            <BotonPrimario type="submit">
              {completada ? "Guardar cambios" : esPremium ? "Guardar en mi Proyecto" : "Guardar mis respuestas"}
            </BotonPrimario>
          </form>
        ) : (
          !completada && (
            <form action={guardar}>
              <BotonPrimario type="submit">Marcar como completada</BotonPrimario>
            </form>
          )
        )}

        {completada &&
          (siguiente ? (
            <Link
              href={`/experiencias/${siguiente.id}`}
              className="block rounded-full border border-texto/15 px-6 py-3 text-center text-sm font-semibold text-texto"
            >
              Siguiente: {siguiente.titulo} →
            </Link>
          ) : (
            <Link href="/mi-sueno" className="block text-center text-sm font-medium text-marca">
              Volver a mi ruta →
            </Link>
          ))}
      </div>
    </main>
  );
}
