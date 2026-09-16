import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { eliminarPublicacionMeli, eliminarPublicacionComunidad } from "@/lib/acciones/comunidadAdmin";
import { obtenerPublicacionesUsuariasAdmin, unoDeRelacion } from "@/lib/datos";
import BotonEliminarConfirmado from "@/components/admin/BotonEliminarConfirmado";

export default async function AdminComunidadPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: categoria }, { data: autorizacion }] = await Promise.all([
    supabase.from("categorias_comunidad").select("id").eq("nombre", "Meli").maybeSingle(),
    supabase.from("autorizaciones").select("rol").eq("usuario_id", user?.id).maybeSingle(),
  ]);
  const esAdmin = autorizacion?.rol === "admin";

  const { data: publicaciones } = categoria
    ? await supabase
        .from("publicaciones_comunidad")
        .select("id, titulo, contenido, estado, fecha_creado")
        .eq("categoria_id", categoria.id)
        .order("fecha_creado", { ascending: false })
    : { data: [] };

  const publicacionesUsuarias = await obtenerPublicacionesUsuariasAdmin(supabase);

  return (
    <div className="space-y-10">
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

      <div className="space-y-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Publicaciones de la comunidad</h2>
          <p className="text-sm text-texto/50">Todo lo que publicaron las usuarias, fuera de Meli.</p>
        </div>

        <div className="space-y-3">
          {publicacionesUsuarias.map((p) => {
            const cat = unoDeRelacion(p.categorias_comunidad as unknown as { nombre: string } | { nombre: string }[] | null);
            const eliminar = eliminarPublicacionComunidad.bind(null, p.id);
            const fecha = new Date(p.fecha_creado).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-card border border-texto/10 bg-tarjeta p-4">
                <div className="min-w-0">
                  <p className="font-medium">
                    {p.nombreAutora} <span className="font-normal text-texto/40">· {cat?.nombre ?? "—"} · {fecha}</span>
                  </p>
                  <p className="truncate text-sm text-texto/60">{p.contenido.slice(0, 80)}</p>
                </div>
                {esAdmin && (
                  <form action={eliminar} className="shrink-0">
                    <BotonEliminarConfirmado mensaje="¿Eliminar esta publicación? Esta acción no se puede deshacer." />
                  </form>
                )}
              </div>
            );
          })}
          {publicacionesUsuarias.length === 0 && (
            <p className="text-sm text-texto/50">Todavía no hay publicaciones de usuarias.</p>
          )}
        </div>
      </div>
    </div>
  );
}
