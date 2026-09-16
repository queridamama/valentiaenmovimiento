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

export function Titulo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`font-display text-[26px] font-semibold leading-tight text-marca ${className}`}>{children}</h1>;
}

export function Subtitulo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[15px] leading-relaxed text-texto/65 ${className}`}>{children}</p>;
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

// Barra de progreso simple para recorridos con pasos reales (Mi Ruta,
// Proyecto). Nunca inventa el total ni el actual — los recibe como props.
export function BarraProgreso({ actual, total }: { actual: number; total: number }) {
  const porcentaje = total > 0 ? Math.round((actual / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-texto/10">
        <div className="h-full rounded-full bg-marca transition-all" style={{ width: `${porcentaje}%` }} />
      </div>
      <p className="text-xs text-texto/45">
        {actual} de {total} completados
      </p>
    </div>
  );
}
