import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { guardarCurso, crearModulo, renombrarModulo, eliminarModulo } from "@/lib/acciones/cursos";
import { agregarUbicacionModulo, quitarUbicacion } from "@/lib/acciones/contenidos";
import { unoDeRelacion } from "@/lib/datos";
import { ETIQUETA_TIPO_CONTENIDO, ESTADOS_CMS, type TipoContenido } from "@/lib/tipos";

export default async function EditarCursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();

  const [{ data: curso }, { data: modulos }, { data: todosLosContenidos }] = await Promise.all([
    supabase.from("cursos").select("*").eq("id", id).maybeSingle(),
    supabase.from("modulos").select("id, titulo, orden").eq("curso_id", id).order("orden"),
    supabase.from("contenidos").select("id, titulo, tipo").order("titulo"),
  ]);

  if (!curso) return <p className="text-sm text-texto/50">Curso no encontrado.</p>;

  const moduloIds = (modulos ?? []).map((m) => m.id);
  const { data: ubicaciones } = moduloIds.length
    ? await supabase
        .from("contenido_ubicaciones")
        .select("id, modulo_id, orden, contenidos(id, titulo, tipo)")
        .in("modulo_id", moduloIds)
        .order("orden")
    : { data: [] };

  const guardar = guardarCurso.bind(null, id);
  const crearMod = crearModulo.bind(null, id);

  return (
    <div className="max-w-2xl space-y-8">
      <Link href="/admin/cursos" className="text-sm text-texto/50">
        ← Cursos
      </Link>

      <form action={guardar} className="space-y-4">
        <h1 className="font-display text-2xl font-semibold">Editar curso</h1>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Título</span>
          <input name="titulo" defaultValue={curso.titulo} required className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Descripción</span>
          <textarea
            name="descripcion"
            defaultValue={curso.descripcion ?? ""}
            rows={3}
            className="rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Acceso</span>
            <select name="nivel_acceso" defaultValue={curso.nivel_acceso} className="rounded-lg border border-texto/15 px-3 py-2">
              <option value="gratis">Gratis</option>
              <option value="membresia">Premium</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Estado</span>
            <select name="estado" defaultValue={curso.estado} className="rounded-lg border border-texto/15 px-3 py-2">
              {ESTADOS_CMS.map((e) => (
                <option key={e} value={e}>
                  {e === "borrador" ? "Borrador" : e === "publicado" ? "Publicado" : "Archivado"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Orden</span>
            <input type="number" name="orden" defaultValue={curso.orden} className="rounded-lg border border-texto/15 px-3 py-2" />
          </label>
        </div>
        <button type="submit" className="rounded-full bg-acento px-6 py-3 text-sm font-semibold text-white">
          Guardar cambios
        </button>
      </form>

      <section className="space-y-4 border-t border-texto/10 pt-6">
        <h2 className="font-medium">Módulos</h2>

        <div className="space-y-4">
          {(modulos ?? []).map((modulo) => {
            const contenidosDelModulo = (ubicaciones ?? []).filter((u) => u.modulo_id === modulo.id);
            const guardarNombre = renombrarModulo.bind(null, modulo.id, id);
            const eliminar = eliminarModulo.bind(null, modulo.id, id);

            return (
              <div key={modulo.id} className="space-y-3 rounded-card border border-texto/10 bg-tarjeta p-4">
                <form action={guardarNombre} className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="text-xs text-texto/50">Título del módulo</span>
                    <input name="titulo" defaultValue={modulo.titulo} className="rounded-lg border border-texto/15 px-3 py-2 text-sm" />
                  </label>
                  <label className="flex w-20 flex-col gap-1">
                    <span className="text-xs text-texto/50">Orden</span>
                    <input type="number" name="orden" defaultValue={modulo.orden} className="rounded-lg border border-texto/15 px-3 py-2 text-sm" />
                  </label>
                  <button className="rounded-full border border-texto/15 px-4 py-2 text-xs font-medium">Guardar</button>
                </form>

                <ul className="space-y-1">
                  {contenidosDelModulo.map((u) => {
                    const contenido = unoDeRelacion(
                      u.contenidos as unknown as { id: string; titulo: string; tipo: string } | { id: string; titulo: string; tipo: string }[] | null
                    );
                    const quitar = quitarUbicacion.bind(null, u.id, contenido?.id ?? "");
                    return (
                      <li key={u.id} className="flex items-center justify-between rounded-lg border border-texto/10 px-3 py-2 text-sm">
                        <span>
                          {contenido?.titulo}{" "}
                          <span className="text-xs text-texto/40">
                            ({ETIQUETA_TIPO_CONTENIDO[contenido?.tipo as TipoContenido] ?? contenido?.tipo})
                          </span>
                        </span>
                        <form action={quitar}>
                          <button className="text-xs font-medium text-alerta">Quitar</button>
                        </form>
                      </li>
                    );
                  })}
                  {contenidosDelModulo.length === 0 && (
                    <p className="text-sm italic text-texto/40">Todavía no tiene contenidos.</p>
                  )}
                </ul>

                <form action={agregarUbicacionModulo} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="moduloId" value={modulo.id} />
                  <select name="contenidoId" className="flex-1 rounded-lg border border-texto/15 px-2 py-1.5 text-sm">
                    {(todosLosContenidos ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.titulo} ({ETIQUETA_TIPO_CONTENIDO[c.tipo as TipoContenido] ?? c.tipo})
                      </option>
                    ))}
                  </select>
                  <button className="rounded-full border border-texto/15 px-4 py-2 text-xs font-medium">
                    Agregar contenido existente
                  </button>
                </form>
                <Link href="/admin/biblioteca/nuevo" className="inline-block text-xs font-medium text-acento">
                  + Crear un contenido nuevo
                </Link>

                {contenidosDelModulo.length === 0 && (
                  <form action={eliminar} className="pt-1">
                    <button className="text-xs font-medium text-alerta">Eliminar este módulo</button>
                  </form>
                )}
              </div>
            );
          })}
          {(modulos ?? []).length === 0 && <p className="text-sm text-texto/50">Todavía no hay módulos.</p>}
        </div>

        <form action={crearMod} className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-texto/50">Nuevo módulo</span>
            <input name="titulo" placeholder="Título del módulo" required className="rounded-lg border border-texto/15 px-3 py-2 text-sm" />
          </label>
          <button className="rounded-full bg-acento px-4 py-2 text-xs font-semibold text-white">+ Agregar módulo</button>
        </form>
      </section>
    </div>
  );
}
