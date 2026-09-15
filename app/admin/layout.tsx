import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

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
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <p className="font-display text-lg font-semibold">Admin · Valentía en Movimiento</p>
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/admin/experiencias" className="text-texto/70 hover:text-texto">
              Experiencias
            </Link>
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
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
