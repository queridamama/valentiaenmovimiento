import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { eliminarPublicacionMeli } from "@/lib/acciones/comunidadAdmin";

export default async function AdminComunidadPage() {
  const supabase = await crearClienteServidor();
  const { data: categoria } = await supabase.from("categorias_comunidad").select("id").eq("nombre", "Meli").maybeSingle();

  const { data: publicaciones } = categoria
    ? await supabase
        .from("publicaciones_comunidad")
        .select("id, titulo, contenido, estado, fecha_creado")
        .eq("categoria_id", categoria.id)
        .order("fecha_creado", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Comunidad · Meli</h1>
        <Link href="/admin/comunidad/nueva" className="rounded-full bg-acento px-5 py-2.5 text-sm font-semibold text-white">
          + Nueva publicación
        </Link>
      </div>

      <div className="space-y-3">
        {(publicaciones ?? []).map((p) => {
          const eliminar = eliminarPublicacionMeli.bind(null, p.id);
          return (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-card border border-texto/10 bg-tarjeta p-4">
              <div>
                <p className="font-medium">{p.titulo || p.contenido.replace(/<[^>]+>/g, "").slice(0, 60) || "(sin texto)"}</p>
                <p className="text-xs text-texto/50">{p.estado === "publicado" ? "Publicado" : "Borrador"}</p>
              </div>
              <div className="flex gap-3 text-sm">
                <Link href={`/admin/comunidad/${p.id}`} className="font-medium text-acento">
                  Editar
                </Link>
                <form action={eliminar}>
                  <button className="font-medium text-alerta">Eliminar</button>
                </form>
              </div>
            </div>
          );
        })}
        {(publicaciones ?? []).length === 0 && <p className="text-sm text-texto/50">Todavía no hay publicaciones de Meli.</p>}
      </div>
    </div>
  );
}
