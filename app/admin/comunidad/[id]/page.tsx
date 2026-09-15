import { crearClienteServidor } from "@/lib/supabase/server";
import { guardarPublicacionMeli } from "@/lib/acciones/comunidadAdmin";
import CampoArchivo from "@/components/admin/CampoArchivo";
import EditorEnriquecido from "@/components/admin/EditorEnriquecido";

export default async function EditarPublicacionMeliPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const { data: publicacion } = await supabase.from("publicaciones_comunidad").select("*").eq("id", id).maybeSingle();

  if (!publicacion) return <p className="text-sm text-texto/50">Publicación no encontrada.</p>;

  const accion = guardarPublicacionMeli.bind(null, id);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-2xl font-semibold">Editar publicación</h1>
      <form action={accion} className="space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Título (opcional)</span>
          <input name="titulo" defaultValue={publicacion.titulo ?? ""} className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>

        <EditorEnriquecido name="contenido" label="Texto" contenidoInicial={publicacion.contenido ?? ""} />

        <CampoArchivo
          label="Imagen (opcional)"
          name="imagen_url"
          carpeta="portadas"
          accept="image/*"
          tipo="imagen"
          valorInicial={publicacion.imagen_url ?? ""}
        />
        <CampoArchivo
          label="Audio (opcional)"
          name="audio_url"
          carpeta="audios"
          accept="audio/*"
          tipo="audio"
          valorInicial={publicacion.audio_url ?? ""}
        />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Estado</span>
          <select name="estado" defaultValue={publicacion.estado} className="w-40 rounded-lg border border-texto/15 px-3 py-2">
            <option value="borrador">Guardar borrador</option>
            <option value="publicado">Publicado</option>
          </select>
        </label>

        <button type="submit" className="rounded-full bg-acento px-6 py-3 text-sm font-semibold text-white">
          Guardar
        </button>
      </form>
    </div>
  );
}
