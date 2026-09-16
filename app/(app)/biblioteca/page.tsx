import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerAutorizacion, obtenerBiblioteca, obtenerCursosGratuitos } from "@/lib/datos";
import { Titulo, Subtitulo, Etiqueta, Badge } from "@/components/ui";
import { IconoPastel } from "@/components/iconos";
import type { TipoIcono } from "@/components/iconos";

const ICONO_POR_TIPO: Record<string, TipoIcono> = {
  meditacion: "corazon",
  audio: "corazon",
  plantilla: "documento",
  recurso: "documento",
  clase: "estrella",
  taller_grabado: "estrella",
};

function Fila({
  href,
  titulo,
  duracion,
  portadaUrl,
  icono,
  premium,
}: {
  href: string;
  titulo: string;
  duracion?: string | null;
  portadaUrl?: string | null;
  icono: TipoIcono;
  premium?: boolean;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-[20px] bg-white p-3.5 shadow-[0_6px_18px_-14px_rgba(37,93,120,0.6)]">
      {portadaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- viene de Storage
        <img src={portadaUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
      ) : (
        <IconoPastel tipo={icono} color="lila" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold text-marca">{titulo}</p>
        {duracion && <p className="text-[12px] text-texto/45">{duracion}</p>}
      </div>
      {premium && <Badge tipo="premium" />}
      <span className="text-marca/30">›</span>
    </Link>
  );
}

function Seccion({ titulo, texto, children }: { titulo: string; texto: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="font-display text-[19px] font-bold text-marca">{titulo}</h2>
        <p className="text-[13px] text-texto/50">{texto}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

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

  const meditaciones = biblioteca.filter((b) => ["meditacion", "audio"].includes(b.contenido.tipo));
  const ejercicios = biblioteca.filter((b) => ["plantilla", "recurso"].includes(b.contenido.tipo));
  const videos = biblioteca.filter((b) => ["clase", "taller_grabado"].includes(b.contenido.tipo));

  return (
    <main className="mx-auto max-w-md space-y-8 px-5 pb-6 pt-6">
      <div className="space-y-2">
        <Titulo>Biblioteca</Titulo>
        <Subtitulo>Videos, meditaciones y recursos para seguir trabajando en vos y en eso que querés construir.</Subtitulo>
      </div>

      {meditaciones.length > 0 && (
        <Seccion titulo="Meditaciones" texto="Audios y meditaciones guiadas.">
          {meditaciones.map((b) => (
            <Fila
              key={b.ubicacionId}
              href={`/biblioteca/${b.contenido.id}`}
              titulo={b.contenido.titulo}
              duracion={b.contenido.duracion}
              portadaUrl={b.contenido.portada_url}
              icono={ICONO_POR_TIPO[b.contenido.tipo] ?? "corazon"}
              premium={b.nivelAcceso === "membresia"}
            />
          ))}
        </Seccion>
      )}

      {ejercicios.length > 0 && (
        <Seccion titulo="Ejercicios y recursos" texto="Guías, hojas de trabajo, preguntas y plantillas descargables.">
          {ejercicios.map((b) => (
            <Fila
              key={b.ubicacionId}
              href={`/biblioteca/${b.contenido.id}`}
              titulo={b.contenido.titulo}
              duracion={b.contenido.duracion}
              portadaUrl={b.contenido.portada_url}
              icono={ICONO_POR_TIPO[b.contenido.tipo] ?? "documento"}
              premium={b.nivelAcceso === "membresia"}
            />
          ))}
        </Seccion>
      )}

      {cursos.length > 0 && (
        <Seccion titulo="Mini cursos gratuitos" texto="Series cortas, con principio y fin.">
          {cursos.map((c) => (
            <Fila key={c.id} href={`/biblioteca/cursos/${c.id}`} titulo={c.titulo} duracion={`${c.cantidadModulos} módulo${c.cantidadModulos === 1 ? "" : "s"}`} icono="pasos" />
          ))}
        </Seccion>
      )}

      {videos.length > 0 && (
        <Seccion titulo="Videos y clases" texto="Contenidos sueltos, para ver cuando quieras.">
          {videos.map((b) => (
            <Fila
              key={b.ubicacionId}
              href={`/biblioteca/${b.contenido.id}`}
              titulo={b.contenido.titulo}
              duracion={b.contenido.duracion}
              portadaUrl={b.contenido.portada_url}
              icono={ICONO_POR_TIPO[b.contenido.tipo] ?? "estrella"}
              premium={b.nivelAcceso === "membresia"}
            />
          ))}
        </Seccion>
      )}

      {meditaciones.length === 0 && ejercicios.length === 0 && cursos.length === 0 && videos.length === 0 && (
        <p className="text-sm italic text-texto/40">Todavía no hay contenidos publicados acá.</p>
      )}

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
