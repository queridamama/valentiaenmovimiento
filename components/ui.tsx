import Link from "next/link";
import type { ReactNode } from "react";

// Piezas visuales chicas y compartidas, tomadas 1 a 1 de los estilos de
// design-reference/Valentía App.dc.html (mismos colores, mismo
// letter-spacing en badges, mismo radio de borde). El objetivo es que
// ninguna página tenga que reinventar el look de una etiqueta o un botón.

export function Badge({ tipo }: { tipo: "gratis" | "membresia" | "premium" }) {
  const estilos: Record<string, string> = {
    gratis: "bg-acentoLima text-texto",
    membresia: "bg-marca/10 text-marca",
    premium: "border border-marca/25 text-marca",
  };
  const etiquetas: Record<string, string> = {
    gratis: "Gratis",
    membresia: "Membresía",
    premium: "Premium",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${estilos[tipo]}`}
    >
      {etiquetas[tipo]}
    </span>
  );
}

export function EstadoBadge({ estado }: { estado: "hecha" | "ahora" | "pendiente" }) {
  const estilos: Record<string, string> = {
    hecha: "bg-acentoLima/30 text-marca",
    ahora: "bg-texto/10 text-texto/70",
    pendiente: "bg-texto/5 text-texto/40",
  };
  const etiquetas: Record<string, string> = { hecha: "Completada ✓", ahora: "Ahora", pendiente: "Pendiente" };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${estilos[estado]}`}>
      {etiquetas[estado]}
    </span>
  );
}

// `variante` da jerarquía sin tener que reinventar el fondo/borde en cada
// pantalla: "default" para info neutra, "destacada" para lo más importante
// del bloque (el próximo paso, un CTA), "suave" para contexto secundario.
export function Tarjeta({
  children,
  className = "",
  variante = "default",
}: {
  children: ReactNode;
  className?: string;
  variante?: "default" | "destacada" | "suave";
}) {
  const estilos: Record<string, string> = {
    default: "border border-texto/10 bg-tarjeta",
    destacada: "border border-marca/25 bg-marca/5",
    suave: "border-0 bg-acento/8",
  };
  return <div className={`rounded-card p-5 ${estilos[variante]} ${className}`}>{children}</div>;
}

export function BotonPrimario({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-full bg-marca px-6 py-4 text-[15px] font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-texto/10 disabled:text-texto/40 ${className}`}
    >
      {children}
    </button>
  );
}

export function BotonSecundario({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-full border border-texto/15 px-6 py-4 text-[15px] font-semibold text-texto transition ${className}`}
    >
      {children}
    </button>
  );
}

export function EnlacePrimario({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="block w-full rounded-full bg-marca px-6 py-4 text-center text-[15px] font-semibold text-white"
    >
      {children}
    </Link>
  );
}

export function Campo({
  label,
  ...props
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-texto/70">{label}</span>}
      <textarea
        {...props}
        className="rounded-card border border-texto/12 bg-tarjeta px-4 py-3 text-[15px] leading-relaxed placeholder:text-texto/35 focus:border-marca focus:outline-none"
      />
    </label>
  );
}

// Título grande y editorial — la escala es a propósito mucho más grande
// que un h1 de dashboard: es el recurso #1 de jerarquía de todo el sistema.
export function Titulo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={`font-display text-[32px] font-bold leading-[1.08] tracking-tight text-marca ${className}`}>
      {children}
    </h1>
  );
}

export function Subtitulo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[15px] leading-relaxed text-texto/65 ${className}`}>{children}</p>;
}

// Eyebrow chico en mayúsculas — antes se repetía como className suelto en
// cada página ("text-xs uppercase tracking-wide text-marca/45"), ahora es
// un solo componente.
export function Etiqueta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-bold uppercase tracking-[0.14em] text-marca ${className}`}>{children}</p>
  );
}

// Resaltado tipo marcador y subrayado a mano — el mismo lenguaje visual de
// la landing, para usar como máximo una vez por bloque (ver brief de
// identidad: "un recurso expresivo por bloque").
export function Marcador({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`marcador marcador-lima ${className}`}>{children}</span>;
}

export function Subrayado({
  children,
  color = "marca",
  className = "",
}: {
  children: ReactNode;
  color?: "marca" | "lima";
  className?: string;
}) {
  return <span className={`subrayado subrayado-${color} ${className}`}>{children}</span>;
}

// Nota manuscrita: el bloque rotado, con fondo pastel y fuente script, que
// aparece como "aside" editorial en las referencias (siempre con texto
// REAL que ya existe en la pantalla — nunca copy inventado acá adentro).
export function NotaManuscrita({
  children,
  color = "rosa",
  rotacion = "izq",
  className = "",
}: {
  children: ReactNode;
  color?: "rosa" | "celeste" | "lila" | "lima";
  rotacion?: "izq" | "der";
  className?: string;
}) {
  const fondos: Record<string, string> = {
    rosa: "bg-acentoRosa/70",
    celeste: "bg-acentoCeleste/50",
    lila: "bg-acento/20",
    lima: "bg-acentoLima/30",
  };
  return (
    <div
      className={`relative rounded-[28px] px-5 py-4 text-center ${fondos[color]} ${className}`}
      style={{ transform: `rotate(${rotacion === "izq" ? "-2deg" : "2deg"})` }}
    >
      <p className="font-script text-xl leading-snug text-marca">{children}</p>
    </div>
  );
}

// Forma orgánica de fondo (blob), puramente decorativa — para romper la
// grilla detrás de una foto, un ícono grande o el header de una pantalla.
export function FormaDecorativa({
  color = "lila",
  className = "",
}: {
  color?: "lila" | "celeste" | "rosa" | "lima" | "marca";
  className?: string;
}) {
  const fondos: Record<string, string> = {
    lila: "bg-acento/35",
    celeste: "bg-acentoCeleste/60",
    rosa: "bg-acentoRosa",
    lima: "bg-acentoLima/40",
    marca: "bg-marca/15",
  };
  return (
    <div
      aria-hidden="true"
      className={`absolute -z-10 ${fondos[color]} ${className}`}
      style={{ borderRadius: "42% 58% 63% 37% / 45% 40% 60% 55%" }}
    />
  );
}

// Progreso real de un recorrido — nunca inventa actual/total, los recibe
// como props. "puntos" es el riel de círculos + línea (Mi Ruta); "linea"
// es la barra angosta (para espacios más chicos, ej. dentro de una card).
export function Progreso({
  actual,
  total,
  variante = "puntos",
}: {
  actual: number;
  total: number;
  variante?: "puntos" | "linea";
}) {
  if (variante === "linea") {
    const porcentaje = total > 0 ? Math.round((actual / total) * 100) : 0;
    return (
      <div className="space-y-1.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/50">
          <div className="h-full rounded-full bg-marca transition-all" style={{ width: `${porcentaje}%` }} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center">
          <span
            className={`h-3.5 w-3.5 shrink-0 rounded-full ${i < actual ? "bg-marca" : "bg-texto/15"}`}
          />
          {i < total - 1 && <span className={`h-[2px] w-6 ${i < actual - 1 ? "bg-marca" : "bg-texto/15"}`} />}
        </div>
      ))}
    </div>
  );
}
