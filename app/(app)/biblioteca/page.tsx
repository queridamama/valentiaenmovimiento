import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerAutorizacion, obtenerBiblioteca, obtenerCursosGratuitos } from "@/lib/datos";
import { Titulo, Subtitulo, Etiqueta } from "@/components/ui";
import { TarjetaCamino } from "@/components/tarjetas";
import type { TipoIcono } from "@/components/iconos";

// Biblioteca como hub de categorías (antes: todos los contenidos listados
// uno debajo del otro en una sola página — con 24+ lecturas, la mujer
// tenía que scrollear muchísimo antes de llegar a clases u otro material).
// Cada categoría es una tarjeta grande, mismo lenguaje visual que los "4
// caminos" de Inicio (TarjetaCamino, reutilizada tal cual). Tocar una
// categoría lleva a /biblioteca/categoria/[categoria], que lista sus
// contenidos — sin duplicar la data ni el modelo, solo la agrupación visual.
const COLOR_POR_CATEGORIA: Record<string, "rosa" | "celeste" | "lila" | "lima"> = {
  escritos: "rosa",
  meditaciones: "lila",
  clases: "celeste",
  recursos: "lima",
  cursos: "rosa",
};

const ICONO_POR_CATEGORIA: Record<string, TipoIcono> = {
  escritos: "libro",
  meditaciones: "corazon",
  clases: "estrella",
  recursos: "documento",
  cursos: "pasos",
};

export default async function BibliotecaPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [autorizacion, biblioteca, cursos] = await Promise.all([
    obtenerAutorizacion(supabase, user.id),
    obtenerBiblioteca(supabase),
    obtenerCursosGratuitos(supabase),
  ]);
  const esPremium = autorizacion.nivel === "premium";

  const categorias = [
    {
      slug: "escritos",
      eyebrow: "Escritos",
      texto: "Reflexiones y textos para volver cuando necesites otra mirada.",
      cantidad: biblioteca.filter((b) => b.contenido.tipo === "lectura").length,
    },
    {
      slug: "meditaciones",
      eyebrow: "Meditaciones",
      texto: "Prácticas guiadas para acompañar tu proceso.",
      cantidad: biblioteca.filter((b) => ["meditacion", "audio"].includes(b.contenido.tipo)).length,
    },
    {
      slug: "clases",
      eyebrow: "Videos y clases",
      texto: "Clases, talleres y masterclasses para profundizar.",
      cantidad: biblioteca.filter((b) => ["clase", "taller_grabado"].includes(b.contenido.tipo)).length,
    },
    {
      slug: "recursos",
      eyebrow: "Recursos",
      texto: "Ejercicios, guías y materiales para llevar a la práctica.",
      cantidad: biblioteca.filter((b) => ["plantilla", "recurso"].includes(b.contenido.tipo)).length,
    },
    {
      slug: "cursos",
      eyebrow: "Mini cursos",
      texto: "Series cortas, con principio y fin.",
      cantidad: cursos.length,
    },
  ].filter((c) => c.cantidad > 0);

  return (
    <main className="mx-auto max-w-md space-y-7 px-5 pb-6 pt-6">
      <div className="space-y-2">
        <Titulo>Biblioteca</Titulo>
        <Subtitulo>Videos, meditaciones y recursos para seguir trabajando en vos y en eso que querés construir.</Subtitulo>
      </div>

      <div className="space-y-4">
        {categorias.map((c) => (
          <TarjetaCamino
            key={c.slug}
            eyebrow={c.eyebrow}
            texto={c.texto}
            nota={`${c.cantidad} contenido${c.cantidad === 1 ? "" : "s"}`}
            cta="Explorar"
            href={`/biblioteca/categoria/${c.slug}`}
            color={COLOR_POR_CATEGORIA[c.slug]}
            icono={ICONO_POR_CATEGORIA[c.slug]}
          />
        ))}
      </div>

      {categorias.length === 0 && <p className="text-sm italic text-texto/40">Todavía no hay contenidos publicados acá.</p>}

      {!esPremium && (
        <section className="space-y-2 rounded-[24px] bg-acento/15 p-5 text-center">
          <Etiqueta>Premium</Etiqueta>
          <p className="text-[14px] text-marca/75">Hay más recursos disponibles cuando das el salto a tu Proyecto de Valentía.</p>
          <Link href="/membresia" className="inline-block pt-1 text-[13px] font-semibold text-marca underline decoration-marca/30 underline-offset-4">
            Conocer Premium →
          </Link>
        </section>
      )}
    </main>
  );
}
