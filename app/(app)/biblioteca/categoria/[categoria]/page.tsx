import Link from "next/link";
import { notFound } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerBiblioteca, obtenerCursosGratuitos } from "@/lib/datos";
import { Titulo, Subtitulo } from "@/components/ui";
import { Fila, ICONO_POR_TIPO, extractoTexto } from "@/components/BibliotecaLista";
import type { TipoIcono } from "@/components/iconos";

const CONFIG_CATEGORIA: Record<string, { titulo: string; texto: string; tipos: string[] }> = {
  escritos: {
    titulo: "Escritos",
    texto: "Reflexiones y textos para volver cuando necesites otra mirada.",
    tipos: ["lectura"],
  },
  meditaciones: {
    titulo: "Meditaciones",
    texto: "Prácticas guiadas para acompañar tu proceso.",
    tipos: ["meditacion", "audio"],
  },
  clases: {
    titulo: "Videos y clases",
    texto: "Clases, talleres y masterclasses para profundizar.",
    tipos: ["clase", "taller_grabado"],
  },
  recursos: {
    titulo: "Recursos",
    texto: "Ejercicios, guías y materiales para llevar a la práctica.",
    tipos: ["plantilla", "recurso"],
  },
};

export default async function CategoriaBibliotecaPage({ params }: { params: Promise<{ categoria: string }> }) {
  const { categoria } = await params;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Mini cursos usa otra tabla y ya tenía su propia pantalla por curso
  // (/biblioteca/cursos/[id]) — acá solo se lista, sin duplicar esa lógica.
  if (categoria === "cursos") {
    const cursos = await obtenerCursosGratuitos(supabase);
    if (cursos.length === 0) notFound();

    return (
      <main className="mx-auto max-w-md space-y-6 px-5 pb-10 pt-6">
        <Link href="/biblioteca" className="text-sm text-texto/50">
          ← Biblioteca
        </Link>
        <div className="space-y-2">
          <Titulo>Mini cursos</Titulo>
          <Subtitulo>Series cortas, con principio y fin.</Subtitulo>
        </div>
        <div className="space-y-4">
          {cursos.map((c) => (
            <Fila
              key={c.id}
              href={`/biblioteca/cursos/${c.id}`}
              titulo={c.titulo}
              duracion={`${c.cantidadModulos} módulo${c.cantidadModulos === 1 ? "" : "s"}`}
              icono="pasos"
            />
          ))}
        </div>
      </main>
    );
  }

  const config = CONFIG_CATEGORIA[categoria];
  if (!config) notFound();

  const biblioteca = await obtenerBiblioteca(supabase);
  const contenidos = biblioteca.filter((b) => config.tipos.includes(b.contenido.tipo));
  if (contenidos.length === 0) notFound();

  return (
    <main className="mx-auto max-w-md space-y-6 px-5 pb-10 pt-6">
      <Link href="/biblioteca" className="text-sm text-texto/50">
        ← Biblioteca
      </Link>
      <div className="space-y-2">
        <Titulo>{config.titulo}</Titulo>
        <Subtitulo>{config.texto}</Subtitulo>
      </div>
      <div className="space-y-4">
        {contenidos.map((b) => (
          <Fila
            key={b.ubicacionId}
            href={`/biblioteca/${b.contenido.id}`}
            titulo={b.contenido.titulo}
            duracion={b.contenido.tipo === "lectura" ? b.contenido.duracion ?? extractoTexto(b.contenido.contenido_html) : b.contenido.duracion}
            portadaUrl={b.contenido.portada_url}
            icono={ICONO_POR_TIPO[b.contenido.tipo] ?? ("documento" as TipoIcono)}
            premium={b.nivelAcceso === "membresia"}
          />
        ))}
      </div>
    </main>
  );
}
