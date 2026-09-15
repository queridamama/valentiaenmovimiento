import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { cambiarEstadoEvento } from "@/lib/acciones/eventos";

export default async function AdminEventosPage() {
  const supabase = await crearClienteServidor();
  const { data: eventos } = await supabase
    .from("eventos")
    .select("id, titulo, fecha_hora, nivel_acceso, estado")
    .order("fecha_hora", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Eventos</h1>
        <Link href="/admin/eventos/nuevo" className="rounded-full bg-acento px-5 py-2.5 text-sm font-semibold text-white">
          + Nuevo evento
        </Link>
      </div>

      <div className="space-y-3">
        {(eventos ?? []).map((e) => {
          const publicar = cambiarEstadoEvento.bind(null, e.id, "publicado");
          const borrador = cambiarEstadoEvento.bind(null, e.id, "borrador");
          const archivar = cambiarEstadoEvento.bind(null, e.id, "archivado");

          return (
            <div key={e.id} className="space-y-3 rounded-card border border-texto/10 bg-tarjeta p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{e.titulo}</p>
                  <p className="text-xs text-texto/50">
                    {new Date(e.fecha_hora).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                    {e.nivel_acceso === "gratis" ? "Gratis" : "Premium"} · {e.estado}
                  </p>
                </div>
                <Link href={`/admin/eventos/${e.id}`} className="text-sm font-medium text-acento">
                  Editar
                </Link>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
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
              </div>
            </div>
          );
        })}
        {(eventos ?? []).length === 0 && <p className="text-sm text-texto/50">Todavía no hay eventos.</p>}
      </div>
    </div>
  );
}
