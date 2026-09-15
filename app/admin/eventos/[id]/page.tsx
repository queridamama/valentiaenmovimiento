import { crearClienteServidor } from "@/lib/supabase/server";
import { guardarEvento } from "@/lib/acciones/eventos";
import CampoArchivo from "@/components/admin/CampoArchivo";

// datetime-local necesita "YYYY-MM-DDTHH:mm" en hora local, no el ISO con
// zona horaria que devuelve la base.
function aInputLocal(fechaIso: string) {
  const fecha = new Date(fechaIso);
  const offsetMs = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default async function EditarEventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();

  const [{ data: evento }, { data: grabaciones }] = await Promise.all([
    supabase.from("eventos").select("*").eq("id", id).maybeSingle(),
    supabase.from("contenidos").select("id, titulo").eq("tipo", "taller_grabado").order("titulo"),
  ]);

  if (!evento) return <p className="text-sm text-texto/50">Evento no encontrado.</p>;

  const accion = guardarEvento.bind(null, id);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-2xl font-semibold">Editar evento</h1>
      <form action={accion} className="space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Tipo</span>
          <select name="tipo" defaultValue={evento.tipo} className="rounded-lg border border-texto/15 px-3 py-2">
            <option value="taller_mensual">Taller mensual</option>
            <option value="laboratorio_movimiento">Laboratorio de movimiento</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Título</span>
          <input name="titulo" defaultValue={evento.titulo} required className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Descripción</span>
          <textarea
            name="descripcion"
            defaultValue={evento.descripcion ?? ""}
            rows={3}
            className="rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>

        <CampoArchivo
          label="Portada"
          name="portada_url"
          carpeta="portadas"
          accept="image/*"
          tipo="imagen"
          valorInicial={evento.portada_url ?? ""}
        />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Fecha y hora</span>
          <input
            type="datetime-local"
            name="fecha_hora"
            defaultValue={aInputLocal(evento.fecha_hora)}
            required
            className="rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Link externo (Zoom, Meet, etc.)</span>
          <input
            name="link_externo"
            defaultValue={evento.link_externo ?? ""}
            placeholder="https://…"
            className="rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Grabación asociada (opcional)</span>
          <select
            name="contenido_grabacion_id"
            defaultValue={evento.contenido_grabacion_id ?? ""}
            className="rounded-lg border border-texto/15 px-3 py-2"
          >
            <option value="">Ninguna todavía</option>
            {(grabaciones ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.titulo}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Acceso</span>
            <select name="nivel_acceso" defaultValue={evento.nivel_acceso} className="rounded-lg border border-texto/15 px-3 py-2">
              <option value="gratis">Gratis</option>
              <option value="membresia">Premium</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Estado</span>
            <select name="estado" defaultValue={evento.estado} className="rounded-lg border border-texto/15 px-3 py-2">
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
  );
}
