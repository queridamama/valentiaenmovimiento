import Link from "next/link";
import type { ReactNode } from "react";

// Piezas visuales chicas y compartidas, tomadas 1 a 1 de los estilos de
// design-reference/Valentía App.dc.html (mismos colores, mismo
// letter-spacing en badges, mismo radio de borde). El objetivo es que
// ninguna página tenga que reinventar el look de una etiqueta o un botón.

export function Badge({ tipo }: { tipo: "gratis" | "membresia" | "premium" }) {
  const estilos: Record<string, string> = {
    gratis: "bg-acentoLima text-texto",
    membresia: "bg-acentoCeleste/20 text-acentoTeal",
    premium: "border border-texto/15 text-texto/60",
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
    hecha: "bg-acentoLima/30 text-acentoTeal",
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

export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-texto/10 bg-tarjeta p-5 ${className}`}>{children}</div>
  );
}

export function BotonPrimario({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-full bg-acento px-6 py-4 text-[15px] font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-texto/10 disabled:text-texto/40 ${className}`}
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
      className="block w-full rounded-full bg-acento px-6 py-4 text-center text-[15px] font-semibold text-white"
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
        className="rounded-card border border-texto/12 bg-tarjeta px-4 py-3 text-[15px] leading-relaxed placeholder:text-texto/35 focus:border-acento focus:outline-none"
      />
    </label>
  );
}

export function Titulo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`font-display text-[26px] font-semibold leading-tight text-texto ${className}`}>{children}</h1>;
}

export function Subtitulo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[15px] leading-relaxed text-texto/65 ${className}`}>{children}</p>;
}
