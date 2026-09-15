import { crearClienteServidor } from "@/lib/supabase/server";
import { guardarEvento } from "@/lib/acciones/eventos";
import CampoArchivo from "@/components/admin/CampoArchivo";

export default async function NuevoEventoPage() {
  const supabase = await crearClienteServidor();
  const { data: grabaciones } = await supabase
    .from("contenidos")
    .select("id, titulo")
    .eq("tipo", "taller_grabado")
    .order("titulo");

  const accion = guardarEvento.bind(null, null);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-2xl font-semibold">Nuevo evento</h1>
      <form action={accion} className="space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Tipo</span>
          <select name="tipo" defaultValue="taller_mensual" className="rounded-lg border border-texto/15 px-3 py-2">
            <option value="taller_mensual">Taller mensual</option>
            <option value="laboratorio_movimiento">Laboratorio de movimiento</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Título</span>
          <input name="titulo" required className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Descripción</span>
          <textarea name="descripcion" rows={3} className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>

        <CampoArchivo label="Portada" name="portada_url" carpeta="portadas" accept="image/*" tipo="imagen" />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Fecha y hora</span>
          <input type="datetime-local" name="fecha_hora" required className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Link externo (Zoom, Meet, etc.)</span>
          <input name="link_externo" placeholder="https://…" className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Grabación asociada (opcional)</span>
          <select name="contenido_grabacion_id" defaultValue="" className="rounded-lg border border-texto/15 px-3 py-2">
            <option value="">Ninguna todavía</option>
            {(grabaciones ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.titulo}
              </option>
            ))}
          </select>
          <span className="text-xs text-texto/45">
            Para que aparezca acá, primero creá el video como contenido tipo &quot;Taller grabado&quot; en Biblioteca.
          </span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Acceso</span>
            <select name="nivel_acceso" defaultValue="membresia" className="rounded-lg border border-texto/15 px-3 py-2">
              <option value="gratis">Gratis</option>
              <option value="membresia">Premium</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Estado</span>
            <select name="estado" defaultValue="borrador" className="rounded-lg border border-texto/15 px-3 py-2">
              <option value="borrador">Borrador</option>
              <option value="publicado">Publicado</option>
            </select>
          </label>
        </div>

        <button type="submit" className="rounded-full bg-acento px-6 py-3 text-sm font-semibold text-white">
          Crear evento
        </button>
      </form>
    </div>
  );
}
