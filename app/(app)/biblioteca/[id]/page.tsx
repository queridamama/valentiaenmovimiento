import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerContenido } from "@/lib/datos";
import { obtenerArchivosContenido } from "@/lib/acciones/almacenamiento";
import { ETIQUETA_TIPO_CONTENIDO, type TipoContenido } from "@/lib/tipos";
import { Titulo, Subtitulo, Etiqueta } from "@/components/ui";

export default async function ContenidoBibliotecaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const contenido = await obtenerContenido(supabase, id);
  if (!contenido) {
    return (
      <main className="mx-auto max-w-md space-y-4 px-5 py-10 text-center">
        <Titulo>Este contenido no está disponible</Titulo>
        <Subtitulo>Puede estar en borrador, archivado, o requerir Premium.</Subtitulo>
        <Link href="/biblioteca" className="inline-block text-sm font-medium text-marca">
          ← Volver a Biblioteca
        </Link>
      </main>
    );
  }

  const { audioUrl, archivoUrl } = await obtenerArchivosContenido(id);
  const tieneTexto = Boolean((contenido.contenido_html ?? "").trim());

  return (
    <main className="mx-auto max-w-md space-y-6 px-5 pb-10 pt-6">
      <Link href="/biblioteca" className="text-sm text-texto/50">
        ← Biblioteca
      </Link>

      {contenido.portada_url && (
        // eslint-disable-next-line @next/next/no-img-element -- viene de Storage
        <img src={contenido.portada_url} alt="" className="aspect-[16/10] w-full rounded-[24px] object-cover" />
      )}

      <div className="space-y-2">
        <Etiqueta>
          {ETIQUETA_TIPO_CONTENIDO[contenido.tipo as TipoContenido] ?? contenido.tipo}
          {contenido.duracion ? ` · ${contenido.duracion}` : ""}
        </Etiqueta>
        <h1 className="font-display text-[26px] font-bold leading-tight text-marca">{contenido.titulo}</h1>
        {contenido.descripcion && <Subtitulo>{contenido.descripcion}</Subtitulo>}
      </div>

      {contenido.video_url && (
        <a
          href={contenido.video_url}
          target="_blank"
          rel="noreferrer"
          className="block rounded-full bg-marca px-6 py-4 text-center text-[15px] font-semibold text-white"
        >
          Ver el video →
        </a>
      )}

      {audioUrl && <audio src={audioUrl} controls className="w-full" />}

      {archivoUrl && (
        <a href={archivoUrl} target="_blank" rel="noreferrer" className="block rounded-full border border-marca/25 px-6 py-3.5 text-center text-[15px] font-semibold text-marca">
          Descargar →
        </a>
      )}

      {tieneTexto && (
        <div className="contenido-enriquecido" dangerouslySetInnerHTML={{ __html: contenido.contenido_html ?? "" }} />
      )}
    </main>
  );
}
