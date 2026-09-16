import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPublicacionDetalle, obtenerComentarios, unoDeRelacion } from "@/lib/datos";
import { comentar, alternarReaccion } from "@/lib/acciones/comunidad";
import { obtenerAudioPublicacion } from "@/lib/acciones/almacenamiento";
import { tiempoRelativo } from "@/lib/fechas";
import { Campo, Titulo, Etiqueta } from "@/components/ui";

const REACCIONES: { tipo: "corazon" | "fuego" | "aplauso"; emoji: string }[] = [
  { tipo: "corazon", emoji: "❤️" },
  { tipo: "fuego", emoji: "🔥" },
  { tipo: "aplauso", emoji: "👏" },
];

export default async function PublicacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const post = await obtenerPublicacionDetalle(supabase, id);
  if (!post) {
    return (
      <main className="mx-auto max-w-md space-y-4 px-5 py-10 text-center">
        <Titulo>Esta publicación no está disponible</Titulo>
        <Link href="/comunidad" className="text-sm font-medium text-marca">
          ← Volver a Comunidad
        </Link>
      </main>
    );
  }

  const comentarios = await obtenerComentarios(supabase, id);
  const autor = unoDeRelacion(post.perfiles as unknown as { nombre: string } | { nombre: string }[] | null);
  const cat = unoDeRelacion(post.categorias_comunidad as unknown as { nombre: string } | { nombre: string }[] | null);
  const reacciones = (post.reacciones ?? []) as { tipo: string; usuario_id: string }[];
  const comentarAqui = comentar.bind(null, id);
  const audioUrl = post.audio_url ? await obtenerAudioPublicacion(id) : null;
  const esDeMeli = cat?.nombre === "Meli";
  const nombreMostrado = esDeMeli ? "Meli" : autor?.nombre ?? "Alguien de la comunidad";
  const inicial = nombreMostrado.trim().charAt(0).toUpperCase();

  return (
    <main className="mx-auto max-w-md space-y-6 px-5 pb-6 pt-6">
      <Link href="/comunidad" className="text-sm text-texto/50">
        ← Comunidad
      </Link>

      <div className={`space-y-3 rounded-[26px] p-5 ${esDeMeli ? "bg-marca text-white" : "bg-white shadow-[0_8px_24px_-16px_rgba(37,93,120,0.5)]"}`}>
        <div className="flex items-center gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              esDeMeli ? "bg-acentoLima text-marca" : "bg-acento/30 text-marca"
            }`}
          >
            {inicial}
          </span>
          <div>
            <p className={`text-sm font-semibold ${esDeMeli ? "text-white" : "text-marca"}`}>{nombreMostrado}</p>
            <p className={`text-[11px] ${esDeMeli ? "text-white/60" : "text-texto/40"}`}>{tiempoRelativo(post.fecha_creado)}</p>
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
            {audioUrl && <audio src={audioUrl} controls className="w-full" />}
          </div>
        ) : (
          <p className="text-[15px] leading-relaxed text-texto/85">{post.contenido}</p>
        )}
        <div className={`flex gap-4 pt-2 ${esDeMeli ? "border-t border-white/15" : "border-t border-texto/8"} pt-3`}>
          {REACCIONES.map((r) => {
            const count = reacciones.filter((x) => x.tipo === r.tipo).length;
            const yaReaccione = reacciones.some((x) => x.tipo === r.tipo && x.usuario_id === user.id);
            const toggle = alternarReaccion.bind(null, id, r.tipo);
            return (
              <form key={r.tipo} action={toggle}>
                <button type="submit" className={`flex items-center gap-1 text-[15px] ${yaReaccione ? "" : "opacity-40"}`}>
                  <span>{r.emoji}</span>
                  {count > 0 && <span className="text-xs">{count}</span>}
                </button>
              </form>
            );
          })}
        </div>
      </div>

      <section className="space-y-3">
        <Etiqueta>Comentarios</Etiqueta>
        <ul className="space-y-2">
          {comentarios.map((c) => {
            const autorComentario = unoDeRelacion(c.perfiles as unknown as { nombre: string } | { nombre: string }[] | null);
            return (
              <li key={c.id} className="rounded-[20px] bg-texto/5 p-3.5 text-sm">
                <p className="font-medium text-marca">{autorComentario?.nombre ?? "Alguien"}</p>
                <p className="text-texto/80">{c.contenido}</p>
              </li>
            );
          })}
          {comentarios.length === 0 && <p className="text-sm italic text-texto/40">Sé la primera en comentar.</p>}
        </ul>

        <form action={comentarAqui} className="space-y-2">
          <Campo name="contenido" label="" placeholder="Escribí un comentario…" rows={2} required />
          <button type="submit" className="rounded-full bg-marca px-6 py-2.5 text-sm font-semibold text-white">
            Comentar
          </button>
        </form>
      </section>
    </main>
  );
}
