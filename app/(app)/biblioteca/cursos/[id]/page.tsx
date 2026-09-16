import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerCursoConModulos } from "@/lib/datos";
import { Titulo, Subtitulo, Etiqueta } from "@/components/ui";
import { IconoPastel } from "@/components/iconos";

export default async function CursoBibliotecaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const curso = await obtenerCursoConModulos(supabase, id);
  if (!curso) {
    return (
      <main className="mx-auto max-w-md space-y-4 px-5 py-10 text-center">
        <Titulo>Este mini curso no está disponible</Titulo>
        <Link href="/biblioteca" className="inline-block text-sm font-medium text-marca">
          ← Volver a Biblioteca
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md space-y-7 px-5 pb-10 pt-6">
      <Link href="/biblioteca" className="text-sm text-texto/50">
        ← Biblioteca
      </Link>

      <div className="space-y-2">
        <Etiqueta>Mini curso gratuito</Etiqueta>
        <Titulo>{curso.titulo}</Titulo>
        {curso.descripcion && <Subtitulo>{curso.descripcion}</Subtitulo>}
      </div>

      <div className="space-y-5">
        {curso.modulos.map((modulo) => (
          <section key={modulo.id} className="space-y-3">
            <h2 className="text-[15px] font-bold text-marca">{modulo.titulo}</h2>
            <div className="space-y-4">
              {modulo.contenidos.map((c) => (
                <Link
                  key={c.id}
                  href={`/biblioteca/${c.id}`}
                  className="flex items-center gap-3 rounded-[20px] bg-white p-3.5 shadow-[0_6px_18px_-14px_rgba(37,93,120,0.6)]"
                >
                  <IconoPastel tipo="estrella" color="lila" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold text-marca">{c.titulo}</p>
                    {c.duracion && <p className="text-[12px] text-texto/45">{c.duracion}</p>}
                  </div>
                  <span className="text-marca/30">›</span>
                </Link>
              ))}
              {modulo.contenidos.length === 0 && <p className="text-xs italic text-texto/35">Todavía sin contenidos.</p>}
            </div>
          </section>
        ))}
        {curso.modulos.length === 0 && <p className="text-sm italic text-texto/40">Todavía no hay módulos.</p>}
      </div>
    </main>
  );
}
