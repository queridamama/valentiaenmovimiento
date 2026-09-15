import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { duplicarExperiencia, cambiarEstadoExperiencia, cambiarAccesoExperiencia } from "@/lib/acciones/admin";

export default async function AdminExperienciasPage() {
  const supabase = await crearClienteServidor();

  const { data: experiencias } = await supabase
    .from("experiencias")
    .select("id, titulo, nivel_acceso, estado, orden, etapa_id, etapas_ruta(nombre)")
    .order("etapa_id", { ascending: true, nullsFirst: true })
    .order("orden", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Experiencias</h1>
        <Link href="/admin/experiencias/nueva" className="rounded-full bg-acento px-5 py-2.5 text-sm font-semibold text-white">
          + Nueva experiencia
        </Link>
      </div>

      <div className="space-y-3">
        {(experiencias ?? []).map((e) => {
          const etapa = Array.isArray(e.etapas_ruta) ? e.etapas_ruta[0] : e.etapas_ruta;
          const duplicar = duplicarExperiencia.bind(null, e.id);
          const publicar = cambiarEstadoExperiencia.bind(null, e.id, "publicado");
          const borrador = cambiarEstadoExperiencia.bind(null, e.id, "borrador");
          const archivar = cambiarEstadoExperiencia.bind(null, e.id, "archivado");
          const aGratis = cambiarAccesoExperiencia.bind(null, e.id, "gratis");
          const aMembresia = cambiarAccesoExperiencia.bind(null, e.id, "membresia");

          return (
            <div key={e.id} className="space-y-3 rounded-card border border-texto/10 bg-tarjeta p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{e.titulo}</p>
                  <p className="text-xs text-texto/50">
                    {etapa?.nombre ?? "Recorrido de entrada"} · orden {e.orden} · {e.nivel_acceso} · {e.estado}
                  </p>
                </div>
                <Link href={`/admin/experiencias/${e.id}`} className="text-sm font-medium text-acento">
                  Editar
                </Link>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <form action={duplicar}>
                  <button className="rounded-full border border-texto/15 px-3 py-1.5">Duplicar</button>
                </form>
                {e.estado !== "publicado" && (
                  <form action={publicar}>
                    <button className="rounded-full border border-acentoTeal/40 px-3 py-1.5 text-acentoTeal">Publicar</button>
                  </form>
                )}
                {e.estado !== "borrador" && (
                  <form action={borrador}>
                    <button className="rounded-full border border-texto/15 px-3 py-1.5">Pasar a borrador</button>
                  </form>
                )}
                {e.estado !== "archivado" && (
                  <form action={archivar}>
                    <button className="rounded-full border border-alerta/40 px-3 py-1.5 text-alerta">Archivar</button>
                  </form>
                )}
                {e.nivel_acceso !== "gratis" && (
                  <form action={aGratis}>
                    <button className="rounded-full border border-texto/15 px-3 py-1.5">Pasar a Gratis</button>
                  </form>
                )}
                {e.nivel_acceso !== "membresia" && (
                  <form action={aMembresia}>
                    <button className="rounded-full border border-texto/15 px-3 py-1.5">Pasar a Premium</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {(experiencias ?? []).length === 0 && <p className="text-sm text-texto/50">Todavía no hay experiencias.</p>}
      </div>
    </div>
  );
}
