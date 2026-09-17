import { crearClienteServidor } from "@/lib/supabase/server";
import { guardarModulo } from "@/lib/acciones/modulos";

export default async function EditarModuloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();

  const [{ data: etapas }, { data: modulo }, { data: experiencias }] = await Promise.all([
    supabase.from("etapas_ruta").select("id, nombre").order("orden"),
    supabase.from("modulos_ruta").select("etapa_id, titulo, descripcion, orden, estado").eq("id", id).maybeSingle(),
    supabase.from("experiencias").select("id, titulo, orden, estado").eq("modulo_id", id).order("orden"),
  ]);

  if (!modulo) return <p className="text-sm text-texto/50">Módulo no encontrado.</p>;

  const accion = guardarModulo.bind(null, id);

  return (
    <div className="max-w-lg space-y-8">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold">Editar módulo</h1>
        <form action={accion} className="space-y-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Etapa</span>
            <select name="etapa_id" defaultValue={modulo.etapa_id} required className="rounded-lg border border-texto/15 px-3 py-2">
              {(etapas ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Título</span>
            <input name="titulo" defaultValue={modulo.titulo} required className="rounded-lg border border-texto/15 px-3 py-2" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Descripción (opcional)</span>
            <textarea
              name="descripcion"
              defaultValue={modulo.descripcion ?? ""}
              rows={3}
              className="rounded-lg border border-texto/15 px-3 py-2"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-texto/70">Orden dentro de la etapa</span>
              <input
                type="number"
                name="orden"
                defaultValue={modulo.orden}
                className="rounded-lg border border-texto/15 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-texto/70">Estado</span>
              <select name="estado" defaultValue={modulo.estado} className="rounded-lg border border-texto/15 px-3 py-2">
                <option value="borrador">Borrador</option>
                <option value="publicado">Publicado</option>
                <option value="archivado">Archivado</option>
              </select>
            </label>
          </div>

          <button type="submit" className="rounded-full bg-acento px-6 py-3 text-sm font-semibold text-white">
            Guardar cambios
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Experiencias en este módulo</h2>
        <p className="text-xs text-texto/50">
          El orden dentro del módulo y el módulo de cada experiencia se editan desde su propia ficha en Experiencias.
        </p>
        <div className="space-y-2">
          {(experiencias ?? []).map((e) => (
            <a
              key={e.id}
              href={`/admin/experiencias/${e.id}`}
              className="block rounded-lg border border-texto/10 px-3 py-2 text-sm hover:bg-texto/5"
            >
              {e.orden}. {e.titulo} <span className="text-texto/40">· {e.estado}</span>
            </a>
          ))}
          {(experiencias ?? []).length === 0 && <p className="text-sm text-texto/50">Todavía no hay experiencias acá.</p>}
        </div>
      </div>
    </div>
  );
}
