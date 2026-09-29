import Link from "next/link";
import { Badge } from "@/components/ui";
import { IconoPastel } from "@/components/iconos";
import type { TipoIcono } from "@/components/iconos";

// Fila de un contenido dentro de una categoría de Biblioteca. Extraído de
// la antigua /biblioteca (que listaba todo en una sola página) para poder
// reutilizarlo tanto ahí como en /biblioteca/categoria/[categoria] sin
// duplicar el mismo bloque dos veces.
export const ICONO_POR_TIPO: Record<string, TipoIcono> = {
  meditacion: "corazon",
  audio: "corazon",
  plantilla: "documento",
  recurso: "documento",
  clase: "estrella",
  taller_grabado: "estrella",
  lectura: "libro",
};

export function Fila({
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

// Para la fila de una lectura, que no tiene `duracion` cargada como las
// demás — un extracto corto de texto plano alcanza (mismo criterio que ya
// usa /admin/comunidad para el extracto de una publicación).
export function extractoTexto(html: string | null, max = 90): string {
  if (!html) return "";
  const texto = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return texto.length > max ? `${texto.slice(0, max)}…` : texto;
}
