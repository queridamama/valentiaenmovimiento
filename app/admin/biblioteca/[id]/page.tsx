import { crearClienteServidor } from "@/lib/supabase/server";
import {
  guardarContenido,
  agregarUbicacionBiblioteca,
  agregarUbicacionEtapa,
  agregarUbicacionModulo,
  quitarUbicacion,
} from "@/lib/acciones/contenidos";
import { unoDeRelacion } from "@/lib/datos";
import { ETIQUETA_TIPO_CONTENIDO, TIPOS_CONTENIDO, ESTADOS_CMS } from "@/lib/tipos";
import CampoArchivo from "@/components/admin/CampoArchivo";
import EditorEnriquecido from "@/components/admin/EditorEnriquecido";

export default async function EditarContenidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();

  const [{ data: contenido }, { data: ubicaciones }, { data: etapas }, { data: modulos }] = await Promise.all([
    supabase.from("contenidos").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("contenido_ubicaciones")
      .select("id, contexto, nivel_acceso, etapas_ruta(nombre), modulos(titulo, cursos(titulo))")
      .eq("contenido_id", id),
    supabase.from("etapas_ruta").select("id, nombre").order("orden"),
    supabase.from("modulos").select("id, titulo, cursos(titulo)").order("titulo"),
  ]);

  if (!contenido) {
    return <p className="text-sm text-texto/50">Contenido no encontrado.</p>;
  }

  const guardar = guardarContenido.bind(null, id);
  const aBiblioteca = agregarUbicacionBiblioteca.bind(null, id);
  const aEtapa = agregarUbicacionEtapa.bind(null, id);

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="font-display text-2xl font-semibold">Editar contenido</h1>

      <form action={guardar} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Tipo</span>
            <select name="tipo" defaultValue={contenido.tipo} className="rounded-lg border border-texto/15 px-3 py-2">
              {TIPOS_CONTENIDO.map((t) => (
                <option key={t} value={t}>
                  {ETIQUETA_TIPO_CONTENIDO[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Estado</span>
            <select name="estado" defaultValue={contenido.estado} className="rounded-lg border border-texto/15 px-3 py-2">
              {ESTADOS_CMS.map((e) => (
                <option key={e} value={e}>
                  {e === "borrador" ? "Borrador" : e === "publicado" ? "Publicado" : "Archivado"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Título</span>
          <input name="titulo" defaultValue={contenido.titulo} required className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Descripción corta</span>
          <input
            name="descripcion"
            defaultValue={contenido.descripcion ?? ""}
            placeholder="Una línea — se usa en las listas"
            className="rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>

        <EditorEnriquecido name="contenido_html" label="Texto" contenidoInicial={contenido.contenido_html ?? ""} />

        <CampoArchivo
          label="Portada"
          name="portada_url"
          carpeta="portadas"
          accept="image/*"
          tipo="imagen"
          valorInicial={contenido.portada_url ?? ""}
        />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Video (URL externa — YouTube, Vimeo, etc.)</span>
          <input
            name="video_url"
            defaultValue={contenido.video_url ?? ""}
            placeholder="https://…"
            className="rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>

        <CampoArchivo
          label="Audio"
          name="audio_url"
          carpeta="audios"
          accept="audio/*"
          tipo="audio"
          valorInicial={contenido.audio_url ?? ""}
        />

        <CampoArchivo
          label="Archivo descargable (PDF)"
          name="archivo_url"
          carpeta="archivos"
          accept="application/pdf"
          tipo="archivo"
          valorInicial={contenido.archivo_url ?? ""}
        />

        <button type="submit" className="rounded-full bg-acento px-6 py-3 text-sm font-semibold text-white">
          Guardar cambios
        </button>
      </form>

      <section className="space-y-4 border-t border-texto/10 pt-6">
        <h2 className="font-medium">Dónde aparece</h2>

        <ul className="space-y-2">
          {(ubicaciones ?? []).map((u) => {
            const etapa = unoDeRelacion(u.etapas_ruta as unknown as { nombre: string } | { nombre: string }[] | null);
            const modulo = unoDeRelacion(
              u.modulos as unknown as { titulo: string; cursos: unknown } | { titulo: string; cursos: unknown }[] | null
            );
            const curso = modulo
              ? unoDeRelacion(modulo.cursos as unknown as { titulo: string } | { titulo: string }[] | null)
              : null;
            const quitar = quitarUbicacion.bind(null, u.id, id);

            let texto = "Biblioteca";
            if (u.contexto === "biblioteca") texto = `Biblioteca · ${u.nivel_acceso === "gratis" ? "Gratis" : "Premium"}`;
            if (u.contexto === "etapa") texto = `Etapa: ${etapa?.nombre ?? "—"} · Premium`;
            if (u.contexto === "modulo") texto = `Curso: ${curso?.titulo ?? "—"} → ${modulo?.titulo ?? "—"}`;

            return (
              <li key={u.id} className="flex items-center justify-between rounded-lg border border-texto/10 px-3 py-2 text-sm">
                <span>{texto}</span>
                <form action={quitar}>
                  <button className="text-xs font-medium text-alerta">Quitar</button>
                </form>
              </li>
            );
          })}
          {(ubicaciones ?? []).length === 0 && (
            <p className="text-sm italic text-texto/40">Todavía no aparece en ningún lado.</p>
          )}
        </ul>

        <div className="grid gap-3 sm:grid-cols-3">
          <form action={aBiblioteca} className="space-y-2 rounded-lg border border-texto/10 p-3">
            <p className="text-xs font-semibold text-texto/50">Agregar a Biblioteca</p>
            <select name="nivelAcceso" defaultValue="gratis" className="w-full rounded-lg border border-texto/15 px-2 py-1.5 text-sm">
              <option value="gratis">Gratis</option>
              <option value="membresia">Premium</option>
            </select>
            <button className="w-full rounded-full border border-texto/15 py-1.5 text-xs font-medium">Agregar</button>
          </form>

          <form action={aEtapa} className="space-y-2 rounded-lg border border-texto/10 p-3">
            <p className="text-xs font-semibold text-texto/50">Agregar a una etapa</p>
            <select name="etapaId" className="w-full rounded-lg border border-texto/15 px-2 py-1.5 text-sm">
              {(etapas ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
            <button className="w-full rounded-full border border-texto/15 py-1.5 text-xs font-medium">Agregar</button>
          </form>

          <form action={agregarUbicacionModulo} className="space-y-2 rounded-lg border border-texto/10 p-3">
            <input type="hidden" name="contenidoId" value={id} />
            <p className="text-xs font-semibold text-texto/50">Agregar a un módulo de curso</p>
            <select name="moduloId" className="w-full rounded-lg border border-texto/15 px-2 py-1.5 text-sm">
              {(modulos ?? []).map((m) => {
                const curso = unoDeRelacion(m.cursos as unknown as { titulo: string } | { titulo: string }[] | null);
                return (
                  <option key={m.id} value={m.id}>
                    {curso?.titulo ?? "Curso"} — {m.titulo}
                  </option>
                );
              })}
            </select>
            <button className="w-full rounded-full border border-texto/15 py-1.5 text-xs font-medium">Agregar</button>
          </form>
        </div>
      </section>
    </div>
  );
}
