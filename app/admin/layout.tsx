import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

const DESTINOS = [
  { href: "/admin/experiencias", label: "Experiencias" },
  { href: "/admin/biblioteca", label: "Biblioteca" },
  { href: "/admin/cursos", label: "Cursos" },
  { href: "/admin/comunidad", label: "Comunidad" },
  { href: "/admin/eventos", label: "Eventos" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: autorizacion } = await supabase
    .from("autorizaciones")
    .select("rol")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!autorizacion || !["admin", "editor"].includes(autorizacion.rol)) {
    redirect("/inicio");
  }

  return (
    <div className="min-h-screen bg-fondo">
      <header className="border-b border-texto/10 bg-tarjeta px-6 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <Link href="/admin" className="font-display text-lg font-semibold">
            Admin · Valentía en Movimiento
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm font-medium">
            {DESTINOS.map((d) => (
              <Link key={d.href} href={d.href} className="text-texto/70 hover:text-texto">
                {d.label}
              </Link>
            ))}
            {autorizacion.rol === "admin" && (
              <Link href="/admin/usuarias" className="text-texto/70 hover:text-texto">
                Usuarias
              </Link>
            )}
            <Link href="/inicio" className="text-acento">
              Volver a la app
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
