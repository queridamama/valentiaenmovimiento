import { crearClienteServidor } from "@/lib/supabase/server";
import { guardarModulo } from "@/lib/acciones/modulos";

export default async function NuevoModuloPage() {
  const supabase = await crearClienteServidor();
  const { data: etapas } = await supabase.from("etapas_ruta").select("id, nombre").order("orden");

  const accion = guardarModulo.bind(null, null);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-2xl font-semibold">Nuevo módulo</h1>
      <form action={accion} className="space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Etapa</span>
          <select name="etapa_id" required className="rounded-lg border border-texto/15 px-3 py-2">
            <option value="">Elegir…</option>
            {(etapas ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Título</span>
          <input name="titulo" required className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Descripción (opcional)</span>
          <textarea name="descripcion" rows={3} className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Orden dentro de la etapa</span>
            <input type="number" name="orden" defaultValue={1} className="rounded-lg border border-texto/15 px-3 py-2" />
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

        <button type="submit" className="rounded-full bg-acento px-6 py-3 text-sm font-semibold text-white">
          Crear módulo
        </button>
      </form>
    </div>
  );
}
