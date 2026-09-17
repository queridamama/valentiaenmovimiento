import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { duplicarContenido, cambiarEstadoContenido } from "@/lib/acciones/contenidos";
import { ETIQUETA_TIPO_CONTENIDO, type TipoContenido } from "@/lib/tipos";

export default async function AdminBibliotecaPage() {
  const supabase = await crearClienteServidor();
  const { data: contenidos } = await supabase
    .from("contenidos")
    .select("id, titulo, tipo, estado, actualizado_en, etapa_wp, modulo_wp")
    .order("actualizado_en", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Biblioteca</h1>
        <Link href="/admin/biblioteca/nuevo" className="rounded-full bg-acento px-5 py-2.5 text-sm font-semibold text-white">
          + Nuevo contenido
        </Link>
      </div>

      <div className="space-y-3">
        {(contenidos ?? []).map((c) => {
          const publicar = cambiarEstadoContenido.bind(null, c.id, "publicado");
          const borrador = cambiarEstadoContenido.bind(null, c.id, "borrador");
          const archivar = cambiarEstadoContenido.bind(null, c.id, "archivado");
          const duplicar = duplicarContenido.bind(null, c.id);

          return (
            <div key={c.id} className="space-y-3 rounded-card border border-texto/10 bg-tarjeta p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{c.titulo}</p>
                  <p className="text-xs text-texto/50">
                    {ETIQUETA_TIPO_CONTENIDO[c.tipo as TipoContenido] ?? c.tipo} · {c.estado}
                    {c.etapa_wp && (
                      <span className="ml-1 rounded-full bg-acento/15 px-2 py-0.5 text-[11px] font-medium text-acento">
                        WordPress · {c.etapa_wp}
                        {c.modulo_wp ? ` · ${c.modulo_wp}` : ""}
                      </span>
                    )}
                  </p>
                </div>
                <Link href={`/admin/biblioteca/${c.id}`} className="text-sm font-medium text-acento">
                  Editar
                </Link>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <form action={duplicar}>
                  <button className="rounded-full border border-texto/15 px-3 py-1.5">Duplicar</button>
                </form>
                {c.estado !== "publicado" && (
                  <form action={publicar}>
                    <button className="rounded-full border border-acentoTeal/40 px-3 py-1.5 text-acentoTeal">Publicar</button>
                  </form>
                )}
                {c.estado !== "borrador" && (
                  <form action={borrador}>
                    <button className="rounded-full border border-texto/15 px-3 py-1.5">Pasar a borrador</button>
                  </form>
                )}
                {c.estado !== "archivado" && (
                  <form action={archivar}>
                    <button className="rounded-full border border-alerta/40 px-3 py-1.5 text-alerta">Archivar</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {(contenidos ?? []).length === 0 && <p className="text-sm text-texto/50">Todavía no hay contenidos.</p>}
      </div>
    </div>
  );
}
