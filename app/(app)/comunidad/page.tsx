import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerAutorizacion, obtenerCategorias, obtenerFeedComunidad, unoDeRelacion } from "@/lib/datos";
import { crearPublicacion, alternarReaccion } from "@/lib/acciones/comunidad";
import { obtenerAudioPublicacion } from "@/lib/acciones/almacenamiento";
import { tiempoRelativo } from "@/lib/fechas";
import { Titulo, Subtitulo, Campo } from "@/components/ui";
import { IconoPastel } from "@/components/iconos";

const REACCIONES: { tipo: "corazon" | "fuego" | "aplauso"; emoji: string }[] = [
  { tipo: "corazon", emoji: "❤️" },
  { tipo: "fuego", emoji: "🔥" },
  { tipo: "aplauso", emoji: "👏" },
];

const COLORES_AVATAR = ["bg-acento/30", "bg-acentoCeleste/60", "bg-acentoRosa", "bg-acentoLima/50"];

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

  // El audio de una publicación de Meli vive en el bucket privado: lo que
  // llega en `audio_url` es un path, no algo reproducible directo — hace
  // falta pedir una URL firmada por cada post que tenga uno.
  const audioPorPublicacion = new Map<string, string | null>();
  await Promise.all(
    feed
      .filter((post) => post.audio_url)
      .map(async (post) => {
        audioPorPublicacion.set(post.id, await obtenerAudioPublicacion(post.id));
      })
  );
  const categoriaActiva = categorias.find((c) => c.id === categoriaId);
  const crear = crearPublicacion.bind(null, categoriaActiva?.id ?? categoriasParaPublicar[0]?.id ?? "");

  return (
    <main className="mx-auto max-w-md space-y-6 px-5 pb-6 pt-6">
      <div className="space-y-2">
        <Titulo>Comunidad</Titulo>
        <Subtitulo>Sueños, movimientos y evidencias de mujeres en sus propios 90 días.</Subtitulo>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/comunidad"
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            !categoriaId ? "bg-marca text-white" : "bg-texto/6 text-texto/60"
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
                categoriaId === c.id ? "bg-marca text-white" : "bg-texto/6 text-texto/60"
              } ${bloqueada ? "opacity-50" : ""}`}
            >
              {c.nombre}
              {bloqueada ? " 🔒" : ""}
            </Link>
          );
        })}
      </div>

      {categoriaActiva?.solo_premium && !esPremium ? (
        <div className="rounded-[24px] bg-acento/10 p-5 text-center">
          <p className="text-[15px] font-medium text-marca">Necesito destrabar es para Premium</p>
          <Subtitulo>Sumate a tu Proyecto de Valentía para leer y participar acá.</Subtitulo>
        </div>
      ) : categoriaActiva?.solo_admin_publica && !esStaff ? (
        <div className="rounded-[24px] bg-acento/10 p-5 text-center">
          <Subtitulo>Acá solo publica el equipo de Valentía en Movimiento — vos podés leer, comentar y reaccionar.</Subtitulo>
        </div>
      ) : (
        <form action={crear} className="space-y-3 rounded-[26px] bg-acentoRosa/50 p-5">
          <div className="flex items-center gap-3">
            <IconoPastel tipo="chat" color="blanco" />
            <div>
              <p className="text-[15px] font-bold text-marca">Compartí con la comunidad</p>
              {categoriasParaPublicar.length > 1 && !categoriaActiva && (
                <p className="text-xs text-marca/50">Se publica en: {categoriasParaPublicar[0]?.nombre}</p>
              )}
            </div>
          </div>
          <Campo name="contenido" label="" placeholder="Contá algo a la comunidad…" rows={2} required />
          <button type="submit" className="rounded-full bg-marca px-6 py-2.5 text-sm font-semibold text-white">
            Publicar
          </button>
        </form>
      )}

      <ul className="space-y-4">
        {feed.map((post, i) => {
          const autor = unoDeRelacion(post.perfiles as unknown as { nombre: string } | { nombre: string }[] | null);
          const cat = unoDeRelacion(post.categorias_comunidad as unknown as { nombre: string } | { nombre: string }[] | null);
          const reacciones = (post.reacciones ?? []) as { tipo: string; usuario_id: string }[];
          const comentariosCount = ((post.comentarios ?? []) as { id: string }[]).length;
          const esDeMeli = cat?.nombre === "Meli";
          const nombreMostrado = esDeMeli ? "Meli" : autor?.nombre ?? "Alguien de la comunidad";
          const inicial = nombreMostrado.trim().charAt(0).toUpperCase();

          return (
            <li
              key={post.id}
              className={`space-y-3 rounded-[26px] p-5 ${esDeMeli ? "bg-marca text-white" : "bg-white shadow-[0_8px_24px_-16px_rgba(37,93,120,0.5)]"}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    esDeMeli ? "bg-acentoLima text-marca" : `${COLORES_AVATAR[i % COLORES_AVATAR.length]} text-marca`
                  }`}
                >
                  {inicial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${esDeMeli ? "text-white" : "text-marca"}`}>{nombreMostrado}</p>
                  <p className={`text-[11px] ${esDeMeli ? "text-white/60" : "text-texto/40"}`}>
                    {tiempoRelativo(post.fecha_creado)}
                    {cat?.nombre && !esDeMeli ? ` · ${cat.nombre}` : ""}
                  </p>
                </div>
              </div>
              {esDeMeli ? (
                <div className="space-y-2">
                  {post.titulo && <p className="text-base font-bold">{post.titulo}</p>}
                  {post.imagen_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- viene de Storage
                    <img src={post.imagen_url} alt="" className="w-full rounded-2xl" />
                  )}
                  <div className="contenido-enriquecido text-[15px] text-white/90" dangerouslySetInnerHTML={{ __html: post.contenido }} />
                  {audioPorPublicacion.get(post.id) && (
                    <audio src={audioPorPublicacion.get(post.id)!} controls className="w-full" />
                  )}
                </div>
              ) : (
                <p className="text-[15px] leading-relaxed text-texto/85">{post.contenido}</p>
              )}
              <div className={`flex items-center justify-between pt-1 ${esDeMeli ? "border-t border-white/15" : "border-t border-texto/8"} pt-3`}>
                <div className="flex gap-4">
                  {REACCIONES.map((r) => {
                    const count = reacciones.filter((x) => x.tipo === r.tipo).length;
                    const yaReaccione = reacciones.some((x) => x.tipo === r.tipo && x.usuario_id === user.id);
                    const toggle = alternarReaccion.bind(null, post.id, r.tipo);
                    return (
                      <form key={r.tipo} action={toggle}>
                        <button
                          type="submit"
                          className={`flex items-center gap-1 text-[15px] ${yaReaccione ? "opacity-100" : "opacity-40"}`}
                        >
                          <span>{r.emoji}</span>
                          {count > 0 && <span className="text-xs">{count}</span>}
                        </button>
                      </form>
                    );
                  })}
                </div>
                <Link href={`/comunidad/${post.id}`} className={`text-xs font-semibold ${esDeMeli ? "text-white/80" : "text-marca"}`}>
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
