"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

// Nav inferior de 4 destinos (Inicio, Mi Ruta, Comunidad, Perfil), según
// design-reference/Valentía App.dc.html. El diseño completo tiene un
// quinto tab (Biblioteca) que todavía no se construyó en esta vertical
// (ver STATUS.md) — se suma cuando exista esa sección.
const DESTINOS = [
  { href: "/inicio", label: "Inicio", icono: "inicio" as const },
  { href: "/mi-sueno", label: "Mi Ruta", icono: "ruta" as const },
  { href: "/comunidad", label: "Comunidad", icono: "comunidad" as const },
  { href: "/perfil", label: "Perfil", icono: "perfil" as const },
];

// Iconos de línea simples, hechos a mano — sin sumar una librería de
// iconos para cuatro destinos fijos.
function IconoNav({ tipo, activo }: { tipo: (typeof DESTINOS)[number]["icono"]; activo: boolean }) {
  const color = activo ? "#255D78" : "#1A1A1A73";
  const props = { fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (tipo === "inicio") {
    return (
      <svg viewBox="0 0 24 24" width="21" height="21" {...props}>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9h12v-9" />
      </svg>
    );
  }
  if (tipo === "ruta") {
    return (
      <svg viewBox="0 0 24 24" width="21" height="21" {...props}>
        <path d="M12 3.5 14.2 9l6 .6-4.5 4 1.3 5.9L12 16.6l-5 2.9 1.3-5.9-4.5-4 6-.6Z" />
      </svg>
    );
  }
  if (tipo === "comunidad") {
    return (
      <svg viewBox="0 0 24 24" width="21" height="21" {...props}>
        <circle cx="9" cy="9" r="3" />
        <path d="M3.5 19c.6-3 2.7-4.5 5.5-4.5s4.9 1.5 5.5 4.5" />
        <circle cx="17" cy="8" r="2.3" />
        <path d="M15.5 14.2c2.2.2 3.7 1.6 4.2 3.8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" {...props}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 19.5c.9-3.6 3.5-5.5 7.5-5.5s6.6 1.9 7.5 5.5" />
    </svg>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-fondo pb-24">
      <header className="sticky top-0 z-40 border-b border-marca/10 bg-fondo/90 px-6 py-2.5 backdrop-blur-sm">
        <Link href="/inicio" aria-label="Valentía en Movimiento — Inicio">
          <Logo />
        </Link>
      </header>

      <div className="flex-1">{children}</div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-texto/10 bg-fondo/95 py-3 backdrop-blur">
        {DESTINOS.map((d) => {
          const activo = pathname === d.href || pathname.startsWith(`${d.href}/`);
          return (
            <Link key={d.href} href={d.href} className="flex flex-col items-center gap-1 px-2">
              <IconoNav tipo={d.icono} activo={activo} />
              <span className={`text-[10px] font-medium uppercase tracking-wider ${activo ? "text-marca" : "text-texto/45"}`}>
                {d.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
