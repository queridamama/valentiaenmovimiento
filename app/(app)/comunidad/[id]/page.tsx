import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPublicacionDetalle, obtenerComentarios, unoDeRelacion } from "@/lib/datos";
import { comentar, alternarReaccion } from "@/lib/acciones/comunidad";
import { Campo, Titulo } from "@/components/ui";

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
      <main className="mx-auto max-w-md space-y-4 px-6 py-10 text-center">
        <Titulo>Esta publicación no está disponible</Titulo>
        <Link href="/comunidad" className="text-sm font-medium text-acento">
          ← Volver a Comunidad
        </Link>
      </main>
    );
  }

  const comentarios = await obtenerComentarios(supabase, id);
  const autor = unoDeRelacion(post.perfiles as unknown as { nombre: string } | { nombre: string }[] | null);
  const reacciones = (post.reacciones ?? []) as { tipo: string; usuario_id: string }[];
  const comentarAqui = comentar.bind(null, id);

  return (
    <main className="mx-auto max-w-md space-y-6 px-6 pt-10 pb-6">
      <Link href="/comunidad" className="text-sm text-texto/50">
        ← Comunidad
      </Link>

      <div className="space-y-3 rounded-card border border-texto/10 bg-tarjeta p-4">
        <p className="text-sm font-semibold">{autor?.nombre ?? "Alguien de la comunidad"}</p>
        <p className="text-[15px] leading-relaxed">{post.contenido}</p>
        <div className="flex gap-3 pt-1">
          {REACCIONES.map((r) => {
            const count = reacciones.filter((x) => x.tipo === r.tipo).length;
            const yaReaccione = reacciones.some((x) => x.tipo === r.tipo && x.usuario_id === user.id);
            const toggle = alternarReaccion.bind(null, id, r.tipo);
            return (
              <form key={r.tipo} action={toggle}>
                <button type="submit" className={`flex items-center gap-1 text-sm ${yaReaccione ? "" : "opacity-45"}`}>
                  <span>{r.emoji}</span>
                  {count > 0 && <span className="text-xs">{count}</span>}
                </button>
              </form>
            );
          })}
        </div>
      </div>

      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-texto/45">Comentarios</p>
        <ul className="space-y-2">
          {comentarios.map((c) => {
            const autorComentario = unoDeRelacion(c.perfiles as unknown as { nombre: string } | { nombre: string }[] | null);
            return (
              <li key={c.id} className="rounded-card border border-texto/10 bg-tarjeta p-3 text-sm">
                <p className="font-medium">{autorComentario?.nombre ?? "Alguien"}</p>
                <p className="text-texto/80">{c.contenido}</p>
              </li>
            );
          })}
          {comentarios.length === 0 && <p className="text-sm italic text-texto/40">Sé la primera en comentar.</p>}
        </ul>

        <form action={comentarAqui} className="space-y-2">
          <Campo name="contenido" label="" placeholder="Escribí un comentario…" rows={2} required />
          <button type="submit" className="rounded-full bg-acento px-6 py-2.5 text-sm font-semibold text-white">
            Comentar
          </button>
        </form>
      </section>
    </main>
  );
}
