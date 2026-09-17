import { guardarNovedad } from "@/lib/acciones/novedades";
import CampoArchivo from "@/components/admin/CampoArchivo";
import { TIPOS_NOVEDAD, ETIQUETA_TIPO_NOVEDAD } from "@/lib/tipos";

export default function NuevaNovedadPage() {
  const accion = guardarNovedad.bind(null, null);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-2xl font-semibold">Nueva novedad</h1>
      <form action={accion} className="space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Título</span>
          <input name="titulo" required className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Descripción corta (opcional)</span>
          <textarea name="descripcion" rows={2} className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Tipo</span>
          <select name="tipo" defaultValue="contenido" className="rounded-lg border border-texto/15 px-3 py-2">
            {TIPOS_NOVEDAD.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_NOVEDAD[t]}
              </option>
            ))}
          </select>
        </label>

        <CampoArchivo label="Imagen (opcional)" name="imagen_url" destino="portada" accept="image/*" tipo="imagen" />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Destino (URL interna)</span>
          <input name="href" required placeholder="/experiencias/… , /biblioteca, /eventos, etc." className="rounded-lg border border-texto/15 px-3 py-2" />
          <span className="text-xs text-texto/45">A dónde va la usuaria al tocar la novedad — una meditación, un video, un curso, un evento, cualquier pantalla de la app.</span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Acceso</span>
            <select name="nivel_acceso" defaultValue="gratis" className="rounded-lg border border-texto/15 px-3 py-2">
              <option value="gratis">Gratis</option>
              <option value="membresia">Premium</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Estado</span>
            <select name="estado" defaultValue="borrador" className="rounded-lg border border-texto/15 px-3 py-2">
              <option value="borrador">Borrador</option>
              <option value="publicado">Publicado</option>
              <option value="archivado">Archivado</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" name="destacado" className="h-4 w-4" />
          <span className="text-sm font-medium text-texto/70">Destacar como protagonista en Inicio</span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Publicada desde (opcional)</span>
            <input type="datetime-local" name="publicado_desde" className="rounded-lg border border-texto/15 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Publicada hasta (opcional)</span>
            <input type="datetime-local" name="publicado_hasta" className="rounded-lg border border-texto/15 px-3 py-2" />
          </label>
        </div>

        <button type="submit" className="rounded-full bg-acento px-6 py-3 text-sm font-semibold text-white">
          Crear novedad
        </button>
      </form>
    </div>
  );
}
