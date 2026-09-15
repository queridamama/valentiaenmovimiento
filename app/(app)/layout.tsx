"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Nav inferior de 4 destinos (Inicio, Mi Ruta, Comunidad, Perfil), según
// design-reference/Valentía App.dc.html. El diseño completo tiene un
// quinto tab (Biblioteca) que todavía no se construyó en esta vertical
// (ver STATUS.md) — se suma cuando exista esa sección.
const DESTINOS = [
  { href: "/inicio", label: "Inicio" },
  { href: "/mi-sueno", label: "Mi Ruta" },
  { href: "/comunidad", label: "Comunidad" },
  { href: "/perfil", label: "Perfil" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-fondo pb-24">
      <div className="flex-1">{children}</div>
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-texto/10 bg-fondo/95 py-3 backdrop-blur">
        {DESTINOS.map((d) => {
          const activo = pathname === d.href || pathname.startsWith(`${d.href}/`);
          return (
            <Link key={d.href} href={d.href} className="flex flex-col items-center gap-1.5 px-2">
              <span
                className={`h-[15px] w-[15px] rounded-full ${
                  activo ? "bg-acento" : "border-2 border-texto/35"
                }`}
              />
              <span
                className={`text-[10px] font-medium uppercase tracking-wider ${
                  activo ? "text-texto" : "text-texto/45"
                }`}
              >
                {d.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
