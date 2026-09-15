import Link from "next/link";

// Nav inferior mínima (4 destinos), mobile-first, según la arquitectura de
// información del documento de diseño. Íconos se suman cuando tengamos
// identidad visual — por ahora es solo texto para no bloquear Fase 1.
const DESTINOS = [
  { href: "/inicio", label: "Inicio" },
  { href: "/mi-sueno", label: "Mi Sueño" },
  { href: "/comunidad", label: "Comunidad" },
  { href: "/perfil", label: "Perfil" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col pb-20">
      <div className="flex-1">{children}</div>
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-acentoSuave bg-fondo py-3">
        {DESTINOS.map((d) => (
          <Link key={d.href} href={d.href} className="text-sm text-texto/80">
            {d.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
