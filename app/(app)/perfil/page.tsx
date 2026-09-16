import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge, Titulo, BotonSecundario } from "@/components/ui";

export default async function PerfilPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: autorizacion }] = await Promise.all([
    supabase.from("perfiles").select("nombre").eq("id", user?.id).maybeSingle(),
    supabase.from("autorizaciones").select("nivel, rol").eq("usuario_id", user?.id).maybeSingle(),
  ]);

  const esStaff = autorizacion?.rol === "admin" || autorizacion?.rol === "editor";

  async function cerrarSesion() {
    "use server";
    const supabase = await crearClienteServidor();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-md space-y-6 px-5 pt-6">
      <Titulo>Perfil</Titulo>

      <div className="space-y-3 rounded-[24px] bg-acento/12 p-5">
        <p className="text-[17px] font-medium text-marca">{perfil?.nombre || user?.email}</p>
        <Badge tipo={autorizacion?.nivel === "premium" ? "membresia" : "gratis"} />
      </div>

      <div className="space-y-2">
        <Link href="/mi-proyecto" className="block rounded-[20px] bg-texto/5 p-4 text-[15px] font-medium text-marca">
          Mi Proyecto →
        </Link>
        <Link href="/movimiento" className="block rounded-[20px] bg-texto/5 p-4 text-[15px] font-medium text-marca">
          Mi ritual semanal →
        </Link>
        {esStaff && (
          <Link href="/admin" className="block rounded-[20px] bg-marca/10 p-4 text-[15px] font-medium text-marca">
            Panel de Admin →
          </Link>
        )}
      </div>

      <form action={cerrarSesion}>
        <BotonSecundario type="submit">Cerrar sesión</BotonSecundario>
      </form>
    </main>
  );
}
