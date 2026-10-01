import Link from "next/link";
import type { ReactNode } from "react";
import { Etiqueta } from "./ui";
import { IconoPastel, type TipoIcono } from "./iconos";
import Doodle from "./Doodle";

// Tarjetas compuestas, una por concepto real de la app (sueño, movimiento,
// comunidad, proyecto, paso del recorrido, evidencia). Ninguna decide sus
// propios datos: todo lo real llega por props. Lo que sí deciden es la
// composición visual — fondo pastel, ícono, eyebrow, CTA — para que cada
// bloque de Home/Mi Ruta/Movimiento/Comunidad se sienta distinto en vez de
// ser la misma card blanca repetida.

const FONDOS_BLOQUE: Record<string, string> = {
  rosa: "bg-acentoRosa",
  celeste: "bg-acentoCeleste/60",
  lila: "bg-acento/20",
  lima: "bg-acentoLima/35",
};

function BotonBloque({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full bg-marca px-5 py-2.5 text-[13px] font-semibold text-white transition active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

// Mismo botón, para usar sobre un fondo ya oscuro (bg-marca) donde el
// botón oscuro de arriba se volvería invisible.
function BotonBloqueClaro({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full bg-acentoLima px-5 py-2.5 text-[13px] font-semibold text-marca transition active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

// Bloque protagonista de Home: el sueño real de la usuaria.
export function TarjetaSueno({
  descripcion,
  href,
  cta,
  className = "",
}: {
  descripcion: string;
  href: string;
  cta: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[28px] ${FONDOS_BLOQUE.rosa} p-6 ${className}`}>
      <FormaEsquina />
      <div className="relative space-y-3">
        <Etiqueta>Mi sueño</Etiqueta>
        <p className="font-display text-[21px] font-bold leading-snug text-marca">{descripcion}</p>
        <BotonBloque href={href}>
          {cta} <span aria-hidden="true">→</span>
        </BotonBloque>
      </div>
      <IconoPastel tipo="estrella" color="blanco" tamano="grande" className="absolute right-5 top-5 shadow-sm" />
    </div>
  );
}

// Uno de los "4 caminos" de Inicio (Mi Ruta / Movimiento / Biblioteca /
// Comunidad): mismo esqueleto para las cuatro, cada una con su color,
// ícono, texto explicativo real y CTA según el estado real de la usuaria.
// `nota` es el único dato dinámico (ej. el movimiento ya elegido); `texto`
// es la explicación fija de para qué sirve ese camino.
export function TarjetaCamino({
  eyebrow,
  texto,
  nota,
  cta,
  href,
  color,
  icono,
  className = "",
}: {
  eyebrow: string;
  texto: string;
  nota?: string;
  cta: string;
  href: string;
  color: "rosa" | "celeste" | "lila" | "lima";
  icono: TipoIcono;
  className?: string;
}) {
  return (
    <div className={`space-y-3 rounded-[26px] ${FONDOS_BLOQUE[color]} p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <IconoPastel tipo={icono} color="blanco" />
        <div className="min-w-0 flex-1 space-y-1">
          <Etiqueta>{eyebrow}</Etiqueta>
          <p className="text-[13.5px] leading-relaxed text-marca/75">{texto}</p>
          {nota && <p className="text-[13px] font-medium text-marca">{nota}</p>}
        </div>
      </div>
      <BotonBloque href={href}>
        {cta} <span aria-hidden="true">→</span>
      </BotonBloque>
    </div>
  );
}

// Proyecto de Valentía (Premium): tratamiento oscuro/marca propio, con las
// 5 etapas reales como riel de progreso — nunca gamificado, solo ubica.
export function TarjetaProyecto({
  dia,
  etapaNombre,
  etapaIndice,
  href,
  mostrarCta = true,
  className = "",
}: {
  dia: number;
  etapaNombre?: string;
  etapaIndice: number;
  href?: string;
  // Cuando esta tarjeta se usa DENTRO de /mi-proyecto, un "Ver mi
  // Proyecto →" que apunta a la misma página es un CTA que no lleva a
  // ningún lado nuevo — se oculta ahí. En cualquier otro lugar (ej. Mi
  // Sueño) sigue llevando a Mi Proyecto como siempre.
  mostrarCta?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[28px] bg-marca p-6 text-white ${className}`}>
      <Doodle tipo="chispa" color="#D6DE2B" className="absolute right-6 top-5 h-4 w-4" />
      <Etiqueta className="text-white/70">Proyecto de Valentía</Etiqueta>
      <p className="pt-1 font-display text-[20px] font-bold leading-snug">
        Día {dia} de 90{etapaNombre ? ` · ${etapaNombre}` : ""}
      </p>
      <div className="flex items-center pt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center">
            <span className={`h-3 w-3 shrink-0 rounded-full ${i <= etapaIndice ? "bg-acentoLima" : "bg-white/25"}`} />
            {i < 4 && <span className={`h-[2px] w-5 ${i < etapaIndice ? "bg-acentoLima" : "bg-white/25"}`} />}
          </div>
        ))}
      </div>
      {mostrarCta && href && (
        <Link href={href} className="mt-4 inline-block text-[13px] font-semibold text-white underline decoration-white/40 underline-offset-4">
          Ver mi Proyecto →
        </Link>
      )}
    </div>
  );
}

// "Seguí donde quedaste": el CTA principal de Inicio, tanto para Gratis
// como para Premium — reemplaza el flujo "Inicio → Mi Ruta → etapa →
// módulo → buscar experiencia" por un salto directo a la experiencia
// exacta. `contexto` es la única parte que cambia según el caso ("Mi
// Sueño · Paso 3 de 4" o "CONSTRUÍTE · Hasta dónde te bancás crecer").
export function TarjetaContinuar({
  contexto,
  titulo,
  tipo,
  duracion,
  href,
}: {
  contexto: string;
  titulo: string;
  tipo: "clase" | "meditacion";
  duracion?: string | null;
  href: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-marca p-6 text-white">
      <Doodle tipo="chispa" color="#D6DE2B" className="absolute right-6 top-5 h-4 w-4" />
      <Etiqueta className="text-white/70">Seguí donde quedaste</Etiqueta>
      <p className="pt-1 text-[13px] font-medium text-white/70">{contexto}</p>
      <p className="pt-1 font-display text-[19px] font-bold leading-snug">
        <span aria-hidden="true">{tipo === "meditacion" ? "🎧" : "🎥"}</span> {titulo}
      </p>
      {duracion && <p className="pt-1 text-[12.5px] text-white/60">{duracion}</p>}
      <div className="pt-4">
        <BotonBloqueClaro href={href}>Continuar</BotonBloqueClaro>
      </div>
    </div>
  );
}

// Una sola novedad protagonista, debajo de "Seguí donde quedaste" — nunca
// desplazándolo. Deliberadamente chica: es UN aviso, no otro bloque
// grande compitiendo por atención.
export function TarjetaNovedad({
  titulo,
  descripcion,
  href,
  className = "",
}: {
  titulo: string;
  descripcion?: string | null;
  href: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`block space-y-1 rounded-[22px] ${FONDOS_BLOQUE.lima} p-4 ${className}`}>
      <Etiqueta className="!text-marca/60">✨ Nuevo en Valentía</Etiqueta>
      <p className="text-[14px] font-bold leading-snug text-marca">{titulo}</p>
      {descripcion && <p className="text-[12.5px] leading-snug text-marca/70">{descripcion}</p>}
    </Link>
  );
}

// "Próximo encuentro" Premium (Inicio) — el encuentro en vivo mensual con
// Meli y la comunidad Premium, cargado desde Admin → Eventos. Si todavía
// no hay ninguno cargado, la página de Inicio directamente no renderiza
// esta tarjeta (no se inventa nada acá). El link de Meet solo llega hasta
// acá si RLS ya dejó ver el evento (nivel_acceso='membresia' +
// nivel_actual()='premium') — nunca se resuelve para una cuenta Gratis.
export function TarjetaProximoEncuentro({
  fecha,
  hora,
  titulo,
  href,
}: {
  fecha: string;
  hora: string;
  titulo: string;
  href?: string | null;
}) {
  return (
    <div className="space-y-3 rounded-[26px] bg-acentoCeleste/45 p-5">
      <div className="flex items-start gap-3">
        <IconoPastel tipo="gente" color="blanco" />
        <div className="min-w-0 flex-1 space-y-1">
          <Etiqueta>Próximo encuentro</Etiqueta>
          <p className="text-[13px] font-medium text-marca/70">
            {fecha} · {hora}
          </p>
          <p className="text-[15px] font-bold leading-snug text-marca">{titulo}</p>
        </div>
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-marca px-5 py-2.5 text-[13px] font-semibold text-white transition active:scale-[0.98]"
        >
          Entrar al encuentro <span aria-hidden="true">→</span>
        </a>
      ) : (
        <p className="text-[12.5px] text-marca/55">El link se confirma antes del encuentro.</p>
      )}
    </div>
  );
}

// Meditación de la semana (Inicio) — la actual, lista para escuchar, o la
// próxima todavía bloqueada con su fecha de habilitación. Nunca recibe el
// audio: solo enlaza a Biblioteca (obtenerArchivosContenido resuelve la
// URL firmada recién ahí, cuando ya corresponde reproducirla).
export function TarjetaMeditacionSemanal({
  titulo,
  disponible,
  fechaDisponible,
  href,
}: {
  titulo: string;
  disponible: boolean;
  fechaDisponible?: string | null;
  href: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-[22px] p-4 ${disponible ? FONDOS_BLOQUE.lima : "bg-texto/6"}`}>
      <IconoPastel tipo="corazon" color={disponible ? "blanco" : "marca"} tamano="chico" className={disponible ? "" : "opacity-40"} />
      <div className="min-w-0 flex-1">
        <Etiqueta className={disponible ? undefined : "!text-texto/35"}>Meditación de la semana</Etiqueta>
        <p className={`truncate text-[14px] font-bold leading-snug ${disponible ? "text-marca" : "text-texto/40"}`}>{titulo}</p>
        {!disponible && fechaDisponible && <p className="text-[12px] text-texto/45">Disponible el {fechaDisponible}</p>}
      </div>
      {disponible && (
        <Link href={href} className="shrink-0 text-[12.5px] font-semibold text-marca underline decoration-marca/30 underline-offset-4">
          Escuchar →
        </Link>
      )}
    </div>
  );
}

// Biblioteca + Comunidad, en dos columnas chicas — reemplaza dos tarjetas
// grandes verticales por un cierre compacto de Inicio, sin repetir
// explicaciones largas que ya están en las páginas propias.
export function TarjetaCompacta({
  titulo,
  cta,
  href,
  color,
  icono,
}: {
  titulo: string;
  cta: string;
  href: string;
  color: "rosa" | "celeste" | "lila" | "lima";
  icono: TipoIcono;
}) {
  return (
    <Link href={href} className={`space-y-2 rounded-[20px] ${FONDOS_BLOQUE[color]} p-4`}>
      <IconoPastel tipo={icono} color="blanco" tamano="chico" />
      <div>
        <p className="text-[13.5px] font-bold text-marca">{titulo}</p>
        <p className="text-[12px] font-medium text-marca/60">{cta} →</p>
      </div>
    </Link>
  );
}

// Un blob orgánico chico en la esquina de una card, sin robarle foco al
// contenido — mismo lenguaje que FormaDecorativa pero pensado para vivir
// dentro de una tarjeta ya coloreada (usa blanco translúcido, no un color).
function FormaEsquina() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 bg-white/25"
      style={{ borderRadius: "42% 58% 63% 37% / 45% 40% 60% 55%" }}
    />
  );
}

// Triángulo de play chico, para CTAs de video.
function IconoPlayChico() {
  return (
    <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true">
      <path d="M7 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

function IconoDocumentoChico() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

const COLORES_PASO = ["rosa", "celeste", "lima", "lila"] as const;
export type ColorPaso = (typeof COLORES_PASO)[number];
export { COLORES_PASO };

// Un paso del recorrido (Mi Ruta / Mi Proyecto). `tipo` sigue diciendo qué
// clase de experiencia es; `formato` dice qué recurso real va a encontrar
// la usuaria al entrar (video, audio o PDF).
export function TarjetaPaso({
  titulo,
  descripcion,
  estado,
  color,
  icono,
  href,
  clicable,
  tipo,
  formato,
}: {
  titulo: string;
  descripcion?: string | null;
  estado: "hecha" | "ahora" | "pendiente";
  color: ColorPaso;
  icono: TipoIcono;
  href?: string;
  clicable: boolean;
  tipo?: "clase" | "meditacion";
  formato?: "video" | "audio" | "pdf";
}) {
  const pendiente = estado === "pendiente";
  const formatoEfectivo = formato ?? (tipo === "meditacion" ? "audio" : tipo === "clase" ? "video" : undefined);

  const textoCta =
    formatoEfectivo === "pdf"
      ? estado === "hecha"
        ? "Volver a abrir"
        : "Abrir PDF"
      : formatoEfectivo === "audio"
        ? estado === "hecha"
          ? "Volver a escuchar"
          : "Escuchar meditación"
        : formatoEfectivo === "video"
          ? estado === "hecha"
            ? "Volver a ver"
            : "Ver video"
          : estado === "hecha"
            ? "Volver a ver"
            : "Ver clase";

  const etiquetaFormato =
    formatoEfectivo === "pdf"
      ? "RECURSO PDF"
      : formatoEfectivo === "audio"
        ? "🎧 MEDITACIÓN"
        : formatoEfectivo === "video"
          ? "▶ VIDEO"
          : null;

  const contenido = (
    <div
      className={`relative flex items-start gap-4 rounded-[24px] p-5 ${pendiente ? "bg-texto/6" : FONDOS_BLOQUE[color]}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-marcador text-base ${
          estado === "hecha" ? "bg-marca text-white" : pendiente ? "bg-white text-texto/35" : "bg-white text-marca"
        }`}
        aria-hidden="true"
      >
        {estado === "hecha" ? "✓" : estado === "ahora" ? "◐" : "○"}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        {etiquetaFormato && (
          <p className={`text-[10.5px] font-bold uppercase tracking-wide ${pendiente ? "text-texto/35" : "text-marca/55"}`}>
            {etiquetaFormato}
          </p>
        )}
        <p className={`text-[16px] font-bold leading-snug ${pendiente ? "text-texto/40" : "text-marca"}`}>{titulo}</p>
        {descripcion && (
          <p
            className={`inline-block rounded-2xl px-3 py-1.5 text-[12.5px] leading-snug ${
              pendiente ? "bg-white/60 text-texto/35" : "bg-white/70 text-marca/80"
            }`}
          >
            {descripcion}
          </p>
        )}
        {estado === "ahora" && <Etiqueta className="!text-[10px] text-marca/60">Seguí por acá</Etiqueta>}
        {clicable && (
          <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[12px] font-semibold text-marca">
            {formatoEfectivo === "pdf" ? <IconoDocumentoChico /> : <IconoPlayChico />}
            {textoCta}
          </span>
        )}
      </div>
      <IconoPastel tipo={icono} color={pendiente ? "marca" : "blanco"} className={`shrink-0 ${pendiente ? "opacity-40" : ""}`} />
    </div>
  );
  if (!clicable || !href) return contenido;
  return (
    <Link href={href} className="block">
      {contenido}
    </Link>
  );
}

// Una evidencia real, en grilla de a dos — reemplaza la lista blanca plana.
export function TarjetaEvidencia({
  contenido,
  fecha,
  color,
  icono,
  compartida,
  accionCompartir,
}: {
  contenido: string;
  fecha: string;
  color: ColorPaso;
  icono: TipoIcono;
  compartida: boolean;
  accionCompartir: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className={`space-y-2 rounded-[22px] ${FONDOS_BLOQUE[color]} p-4`}>
      <div className="flex items-center justify-between">
        <IconoPastel tipo={icono} color="blanco" tamano="chico" />
        <span className="text-[11px] text-marca/55">{fecha}</span>
      </div>
      <p className="text-[13.5px] leading-snug text-marca/85">{contenido}</p>
      <form action={accionCompartir}>
        <button type="submit" className="text-[11px] font-semibold text-marca">
          {compartida ? "Compartida ✓" : "Compartir con la comunidad"}
        </button>
      </form>
    </div>
  );
}
