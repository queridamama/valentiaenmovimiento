import { crearClienteServidor } from "@/lib/supabase/server";
import { guardarNovedad } from "@/lib/acciones/novedades";
import CampoArchivo from "@/components/admin/CampoArchivo";
import { TIPOS_NOVEDAD, ETIQUETA_TIPO_NOVEDAD } from "@/lib/tipos";

// datetime-local necesita "YYYY-MM-DDTHH:mm" en hora local, no el ISO con
// zona horaria que devuelve la base (mismo criterio que /admin/eventos).
function aInputLocal(fechaIso: string | null) {
  if (!fechaIso) return "";
  const fecha = new Date(fechaIso);
  const offsetMs = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default async function EditarNovedadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const { data: novedad } = await supabase.from("novedades_inicio").select("*").eq("id", id).maybeSingle();

  if (!novedad) return <p className="text-sm text-texto/50">Novedad no encontrada.</p>;

  const accion = guardarNovedad.bind(null, id);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-2xl font-semibold">Editar novedad</h1>
      <form action={accion} className="space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Título</span>
          <input name="titulo" defaultValue={novedad.titulo} required className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Descripción corta (opcional)</span>
          <textarea
            name="descripcion"
            defaultValue={novedad.descripcion ?? ""}
            rows={2}
            className="rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Tipo</span>
          <select name="tipo" defaultValue={novedad.tipo} className="rounded-lg border border-texto/15 px-3 py-2">
            {TIPOS_NOVEDAD.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_NOVEDAD[t]}
              </option>
            ))}
          </select>
        </label>

        <CampoArchivo
          label="Imagen (opcional)"
          name="imagen_url"
          destino="portada"
          accept="image/*"
          tipo="imagen"
          valorInicial={novedad.imagen_url ?? ""}
        />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Destino (URL interna)</span>
          <input name="href" defaultValue={novedad.href} required className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Acceso</span>
            <select name="nivel_acceso" defaultValue={novedad.nivel_acceso} className="rounded-lg border border-texto/15 px-3 py-2">
              <option value="gratis">Gratis</option>
              <option value="membresia">Premium</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Estado</span>
            <select name="estado" defaultValue={novedad.estado} className="rounded-lg border border-texto/15 px-3 py-2">
              <option value="borrador">Borrador</option>
              <option value="publicado">Publicado</option>
              <option value="archivado">Archivado</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" name="destacado" defaultChecked={novedad.destacado} className="h-4 w-4" />
          <span className="text-sm font-medium text-texto/70">Destacar como protagonista en Inicio</span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Publicada desde</span>
            <input
              type="datetime-local"
              name="publicado_desde"
              defaultValue={aInputLocal(novedad.publicado_desde)}
              className="rounded-lg border border-texto/15 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Publicada hasta (opcional)</span>
            <input
              type="datetime-local"
              name="publicado_hasta"
              defaultValue={aInputLocal(novedad.publicado_hasta)}
              className="rounded-lg border border-texto/15 px-3 py-2"
            />
          </label>
        </div>

        <button type="submit" className="rounded-full bg-acento px-6 py-3 text-sm font-semibold text-white">
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
