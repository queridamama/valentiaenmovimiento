import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { cambiarEstadoNovedad } from "@/lib/acciones/novedades";
import { ETIQUETA_TIPO_NOVEDAD, type TipoNovedad } from "@/lib/tipos";

export default async function AdminNovedadesPage() {
  const supabase = await crearClienteServidor();
  const { data: novedades } = await supabase
    .from("novedades_inicio")
    .select("id, titulo, tipo, nivel_acceso, estado, destacado, publicado_desde")
    .order("publicado_desde", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Nuevo en Valentía</h1>
          <p className="text-sm text-texto/50">
            Una sola novedad se muestra a la vez en Inicio, debajo de &quot;Seguí donde quedaste&quot;. Si hay varias
            marcadas como destacadas, se muestra la más reciente.
          </p>
        </div>
        <Link href="/admin/novedades/nueva" className="rounded-full bg-acento px-5 py-2.5 text-sm font-semibold text-white">
          + Nueva novedad
        </Link>
      </div>

      <div className="space-y-3">
        {(novedades ?? []).map((n) => {
          const publicar = cambiarEstadoNovedad.bind(null, n.id, "publicado");
          const borrador = cambiarEstadoNovedad.bind(null, n.id, "borrador");
          const archivar = cambiarEstadoNovedad.bind(null, n.id, "archivado");

          return (
            <div key={n.id} className="space-y-3 rounded-card border border-texto/10 bg-tarjeta p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {n.titulo} {n.destacado && <span className="text-acento">★ destacada</span>}
                  </p>
                  <p className="text-xs text-texto/50">
                    {ETIQUETA_TIPO_NOVEDAD[n.tipo as TipoNovedad] ?? n.tipo} · {n.nivel_acceso} · {n.estado} · desde{" "}
                    {new Date(n.publicado_desde).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <Link href={`/admin/novedades/${n.id}`} className="text-sm font-medium text-acento">
                  Editar
                </Link>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {n.estado !== "publicado" && (
                  <form action={publicar}>
                    <button className="rounded-full border border-acentoTeal/40 px-3 py-1.5 text-acentoTeal">Publicar</button>
                  </form>
                )}
                {n.estado !== "borrador" && (
                  <form action={borrador}>
                    <button className="rounded-full border border-texto/15 px-3 py-1.5">Pasar a borrador</button>
                  </form>
                )}
                {n.estado !== "archivado" && (
                  <form action={archivar}>
                    <button className="rounded-full border border-alerta/40 px-3 py-1.5 text-alerta">Archivar</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {(novedades ?? []).length === 0 && <p className="text-sm text-texto/50">Todavía no hay novedades.</p>}
      </div>
    </div>
  );
}
