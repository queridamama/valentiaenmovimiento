import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { cambiarEstadoModulo } from "@/lib/acciones/modulos";

export default async function AdminModulosPage() {
  const supabase = await crearClienteServidor();

  const { data: modulos } = await supabase
    .from("modulos_ruta")
    .select("id, titulo, descripcion, orden, estado, etapa_id, etapas_ruta(nombre, orden)")
    .order("etapa_id")
    .order("orden");

  const { data: experiencias } = await supabase.from("experiencias").select("modulo_id").not("modulo_id", "is", null);
  const conteoPorModulo = new Map<string, number>();
  (experiencias ?? []).forEach((e) => conteoPorModulo.set(e.modulo_id as string, (conteoPorModulo.get(e.modulo_id as string) ?? 0) + 1));

  const ordenados = [...(modulos ?? [])].sort((a, b) => {
    const etapaA = Array.isArray(a.etapas_ruta) ? a.etapas_ruta[0] : a.etapas_ruta;
    const etapaB = Array.isArray(b.etapas_ruta) ? b.etapas_ruta[0] : b.etapas_ruta;
    const ordenEtapaA = etapaA?.orden ?? 0;
    const ordenEtapaB = etapaB?.orden ?? 0;
    if (ordenEtapaA !== ordenEtapaB) return ordenEtapaA - ordenEtapaB;
    return a.orden - b.orden;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Módulos de la Ruta</h1>
          <p className="text-sm text-texto/50">
            ETAPA → MÓDULOS → EXPERIENCIAS. Para mover una experiencia entre módulos, editala desde{" "}
            <Link href="/admin/experiencias" className="text-acento">
              Experiencias
            </Link>{" "}
            y cambiá su módulo.
          </p>
        </div>
        <Link href="/admin/modulos/nuevo" className="rounded-full bg-acento px-5 py-2.5 text-sm font-semibold text-white">
          + Nuevo módulo
        </Link>
      </div>

      <div className="space-y-3">
        {ordenados.map((m) => {
          const etapa = Array.isArray(m.etapas_ruta) ? m.etapas_ruta[0] : m.etapas_ruta;
          const publicar = cambiarEstadoModulo.bind(null, m.id, "publicado");
          const borrador = cambiarEstadoModulo.bind(null, m.id, "borrador");
          const archivar = cambiarEstadoModulo.bind(null, m.id, "archivado");

          return (
            <div key={m.id} className="space-y-3 rounded-card border border-texto/10 bg-tarjeta p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{m.titulo}</p>
                  <p className="text-xs text-texto/50">
                    {etapa?.nombre ?? "Sin etapa"} · orden {m.orden} · {m.estado} · {conteoPorModulo.get(m.id) ?? 0} experiencia
                    {(conteoPorModulo.get(m.id) ?? 0) === 1 ? "" : "s"}
                  </p>
                </div>
                <Link href={`/admin/modulos/${m.id}`} className="text-sm font-medium text-acento">
                  Editar
                </Link>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {m.estado !== "publicado" && (
                  <form action={publicar}>
                    <button className="rounded-full border border-acentoTeal/40 px-3 py-1.5 text-acentoTeal">Publicar</button>
                  </form>
                )}
                {m.estado !== "borrador" && (
                  <form action={borrador}>
                    <button className="rounded-full border border-texto/15 px-3 py-1.5">Pasar a borrador</button>
                  </form>
                )}
                {m.estado !== "archivado" && (
                  <form action={archivar}>
                    <button className="rounded-full border border-alerta/40 px-3 py-1.5 text-alerta">Archivar</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {ordenados.length === 0 && <p className="text-sm text-texto/50">Todavía no hay módulos.</p>}
      </div>
    </div>
  );
}
