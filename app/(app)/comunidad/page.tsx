import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerAutorizacion, obtenerCategorias, obtenerFeedComunidad, unoDeRelacion } from "@/lib/datos";
import { crearPublicacion, alternarReaccion } from "@/lib/acciones/comunidad";
import { Titulo, Subtitulo, Campo } from "@/components/ui";

const REACCIONES: { tipo: "corazon" | "fuego" | "aplauso"; emoji: string }[] = [
  { tipo: "corazon", emoji: "❤️" },
  { tipo: "fuego", emoji: "🔥" },
  { tipo: "aplauso", emoji: "👏" },
];

export default async function ComunidadPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria: categoriaId } = await searchParams;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [autorizacion, categorias, feed] = await Promise.all([
    obtenerAutorizacion(supabase, user.id),
    obtenerCategorias(supabase),
    obtenerFeedComunidad(supabase, categoriaId),
  ]);

  const esPremium = autorizacion.nivel === "premium";
  const esStaff = autorizacion.rol === "admin" || autorizacion.rol === "editor";
  const categoriasParaPublicar = categorias.filter(
    (c) => (!c.solo_premium || esPremium) && (!c.solo_admin_publica || esStaff)
  );
  const categoriaActiva = categorias.find((c) => c.id === categoriaId);
  const crear = crearPublicacion.bind(null, categoriaActiva?.id ?? categoriasParaPublicar[0]?.id ?? "");

  return (
    <main className="mx-auto max-w-md space-y-6 px-6 pt-10 pb-6">
      <Titulo>Comunidad</Titulo>
      <Subtitulo>Sueños, movimientos y evidencias de mujeres en sus propios 90 días.</Subtitulo>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/comunidad"
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            !categoriaId ? "bg-texto text-white" : "border border-texto/15 text-texto/70"
          }`}
        >
          Todas
        </Link>
        {categorias.map((c) => {
          const bloqueada = c.solo_premium && !esPremium;
          return (
            <Link
              key={c.id}
              href={`/comunidad?categoria=${c.id}`}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                categoriaId === c.id ? "bg-texto text-white" : "border border-texto/15 text-texto/70"
              } ${bloqueada ? "opacity-50" : ""}`}
            >
              {c.nombre}
              {bloqueada ? " 🔒" : ""}
            </Link>
          );
        })}
      </div>

      {categoriaActiva?.solo_premium && !esPremium ? (
        <div className="rounded-card border border-texto/10 bg-tarjeta p-5 text-center">
          <p className="text-[15px] font-medium">Necesito destrabar es para Premium</p>
          <Subtitulo>Sumate a tu Proyecto de Valentía para leer y participar acá.</Subtitulo>
        </div>
      ) : categoriaActiva?.solo_admin_publica && !esStaff ? (
        <div className="rounded-card border border-texto/10 bg-tarjeta p-5 text-center">
          <Subtitulo>Acá solo publica el equipo de Valentía en Movimiento — vos podés leer, comentar y reaccionar.</Subtitulo>
        </div>
      ) : (
        <form action={crear} className="space-y-3 rounded-card border border-texto/10 bg-tarjeta p-4">
          {categoriasParaPublicar.length > 1 && !categoriaActiva && (
            <p className="text-xs text-texto/45">Se publica en: {categoriasParaPublicar[0]?.nombre}</p>
          )}
          <Campo name="contenido" label="" placeholder="Contá algo a la comunidad…" rows={2} required />
          <button type="submit" className="rounded-full bg-acento px-6 py-2.5 text-sm font-semibold text-white">
            Publicar
          </button>
        </form>
      )}

      <ul className="space-y-4">
        {feed.map((post) => {
          const autor = unoDeRelacion(post.perfiles as unknown as { nombre: string } | { nombre: string }[] | null);
          const cat = unoDeRelacion(post.categorias_comunidad as unknown as { nombre: string } | { nombre: string }[] | null);
          const reacciones = (post.reacciones ?? []) as { tipo: string; usuario_id: string }[];
          const comentariosCount = ((post.comentarios ?? []) as { id: string }[]).length;

          return (
            <li key={post.id} className="space-y-3 rounded-card border border-texto/10 bg-tarjeta p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{cat?.nombre === "Meli" ? "Meli" : autor?.nombre ?? "Alguien de la comunidad"}</p>
                <span className="text-xs text-texto/40">{cat?.nombre}</span>
              </div>
              {cat?.nombre === "Meli" ? (
                <div className="space-y-2">
                  {post.titulo && <p className="text-base font-semibold text-texto">{post.titulo}</p>}
                  {post.imagen_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- viene de Storage
                    <img src={post.imagen_url} alt="" className="w-full rounded-lg" />
                  )}
                  <div className="contenido-enriquecido text-[15px]" dangerouslySetInnerHTML={{ __html: post.contenido }} />
                  {post.audio_url && <audio src={post.audio_url} controls className="w-full" />}
                </div>
              ) : (
                <p className="text-[15px] leading-relaxed">{post.contenido}</p>
              )}
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-3">
                  {REACCIONES.map((r) => {
                    const count = reacciones.filter((x) => x.tipo === r.tipo).length;
                    const yaReaccione = reacciones.some((x) => x.tipo === r.tipo && x.usuario_id === user.id);
                    const toggle = alternarReaccion.bind(null, post.id, r.tipo);
                    return (
                      <form key={r.tipo} action={toggle}>
                        <button
                          type="submit"
                          className={`flex items-center gap-1 text-sm ${yaReaccione ? "opacity-100" : "opacity-45"}`}
                        >
                          <span>{r.emoji}</span>
                          {count > 0 && <span className="text-xs">{count}</span>}
                        </button>
                      </form>
                    );
                  })}
                </div>
                <Link href={`/comunidad/${post.id}`} className="text-xs font-medium text-acento">
                  {comentariosCount > 0 ? `${comentariosCount} comentarios` : "Comentar"}
                </Link>
              </div>
            </li>
          );
        })}
        {feed.length === 0 && <p className="text-sm italic text-texto/40">Todavía no hay publicaciones acá.</p>}
      </ul>
    </main>
  );
}
