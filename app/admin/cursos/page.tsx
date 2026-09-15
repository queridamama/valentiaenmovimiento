import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { cambiarEstadoCurso } from "@/lib/acciones/cursos";

export default async function AdminCursosPage() {
  const supabase = await crearClienteServidor();
  const { data: cursos } = await supabase
    .from("cursos")
    .select("id, titulo, nivel_acceso, estado, orden")
    .order("orden", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Cursos</h1>
        <Link href="/admin/cursos/nuevo" className="rounded-full bg-acento px-5 py-2.5 text-sm font-semibold text-white">
          + Nuevo curso
        </Link>
      </div>

      <div className="space-y-3">
        {(cursos ?? []).map((c) => {
          const publicar = cambiarEstadoCurso.bind(null, c.id, "publicado");
          const borrador = cambiarEstadoCurso.bind(null, c.id, "borrador");
          const archivar = cambiarEstadoCurso.bind(null, c.id, "archivado");

          return (
            <div key={c.id} className="space-y-3 rounded-card border border-texto/10 bg-tarjeta p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{c.titulo}</p>
                  <p className="text-xs text-texto/50">
                    {c.nivel_acceso === "gratis" ? "Gratis" : "Premium"} · {c.estado}
                  </p>
                </div>
                <Link href={`/admin/cursos/${c.id}`} className="text-sm font-medium text-acento">
                  Editar
                </Link>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
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
        {(cursos ?? []).length === 0 && <p className="text-sm text-texto/50">Todavía no hay cursos.</p>}
      </div>
    </div>
  );
}
