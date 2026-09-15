import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerExperienciaConPreguntas, estaCompletada, obtenerSiguienteExperiencia } from "@/lib/datos";
import { guardarRespuestas } from "@/lib/acciones/experiencias";
import { Badge, BotonPrimario, Titulo, Subtitulo } from "@/components/ui";

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
        <Link href="/mi-sueno" className="inline-block text-sm font-medium text-acento">
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
    <main className="mx-auto max-w-md space-y-6 px-6 py-10">
      <Link href="/mi-sueno" className="text-sm text-texto/50">
        ← Atrás
      </Link>

      <div className="space-y-2">
        <Badge tipo={esPremium ? "membresia" : "gratis"} />
        <Titulo>{experiencia.titulo}</Titulo>
        {experiencia.descripcion && <Subtitulo>{experiencia.descripcion}</Subtitulo>}
      </div>

      {experiencia.video_url ? (
        <video src={experiencia.video_url} controls className="w-full rounded-card bg-black" />
      ) : (
        tieneTexto && (
          <div className="rounded-card border border-texto/10 bg-tarjeta p-5 text-sm text-texto/40">
            Todavía no hay video para esta clase — podés seguir con el texto.
          </div>
        )
      )}

      {tieneTexto && (
        <div className="contenido-enriquecido" dangerouslySetInnerHTML={{ __html: experiencia.texto_intro ?? "" }} />
      )}

      {completada ? (
        <div className="space-y-4 rounded-card border border-acentoLima/50 bg-acentoLima/10 p-5">
          <p className="font-medium">
            {esPremium ? "Esto ya forma parte de tu Proyecto de Valentía." : "Guardado. Ya es parte de tu recorrido."}
          </p>
          {siguiente ? (
            <Link
              href={`/experiencias/${siguiente.id}`}
              className="inline-block rounded-full bg-acento px-6 py-3 text-sm font-semibold text-white"
            >
              Siguiente: {siguiente.titulo} →
            </Link>
          ) : (
            <Link href="/mi-sueno" className="inline-block text-sm font-medium text-acento">
              Volver a mi ruta →
            </Link>
          )}
        </div>
      ) : (
        <form action={guardar} className="space-y-5">
          <p className="text-xs uppercase tracking-wide text-texto/45">Tus respuestas</p>
          {preguntas.map((p) => (
            <label key={p.id} className="flex flex-col gap-2">
              <span className="text-[15px] font-medium text-texto">{p.texto}</span>
              <textarea
                name={`pregunta_${p.id}`}
                defaultValue={p.respuestaActual}
                placeholder={p.placeholder ?? ""}
                rows={3}
                required
                className="rounded-card border border-texto/12 bg-tarjeta px-4 py-3 text-[15px] leading-relaxed placeholder:text-texto/35 focus:border-acento focus:outline-none"
              />
            </label>
          ))}
          <BotonPrimario type="submit">
            {esPremium ? "Guardar en mi Proyecto" : "Guardar mis respuestas"}
          </BotonPrimario>
        </form>
      )}
    </main>
  );
}
