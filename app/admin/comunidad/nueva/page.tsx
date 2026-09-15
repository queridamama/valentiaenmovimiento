import { guardarPublicacionMeli } from "@/lib/acciones/comunidadAdmin";
import CampoArchivo from "@/components/admin/CampoArchivo";
import EditorEnriquecido from "@/components/admin/EditorEnriquecido";

export default function NuevaPublicacionMeliPage() {
  const accion = guardarPublicacionMeli.bind(null, null);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-2xl font-semibold">Nueva publicación de Meli</h1>
      <form action={accion} className="space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Título (opcional)</span>
          <input name="titulo" className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>

        <EditorEnriquecido name="contenido" label="Texto" />

        <CampoArchivo label="Imagen (opcional)" name="imagen_url" destino="portada" accept="image/*" tipo="imagen" />
        <CampoArchivo label="Audio (opcional)" name="audio_url" destino="audio" accept="audio/*" tipo="audio" />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Estado</span>
          <select name="estado" defaultValue="borrador" className="w-40 rounded-lg border border-texto/15 px-3 py-2">
            <option value="borrador">Guardar borrador</option>
            <option value="publicado">Publicar</option>
          </select>
        </label>

        <button type="submit" className="rounded-full bg-acento px-6 py-3 text-sm font-semibold text-white">
          Guardar
        </button>
      </form>
    </div>
  );
}
