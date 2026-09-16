import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge, Titulo, Etiqueta, BotonSecundario } from "@/components/ui";

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
  const esPremium = autorizacion?.nivel === "premium";

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
        <Badge tipo={esPremium ? "membresia" : "gratis"} />
      </div>

      {esPremium ? (
        <div className="space-y-2.5 rounded-[24px] bg-marca p-5 text-white">
          <Etiqueta className="!text-white/70">Tu cuenta</Etiqueta>
          <p className="text-[15px] font-semibold">Premium activo</p>
          <Link href="/mi-proyecto" className="inline-block rounded-full bg-acentoLima px-5 py-2.5 text-[13px] font-semibold text-marca">
            Ver mi Proyecto →
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5 rounded-[24px] bg-texto/5 p-5">
          <Etiqueta>Tu cuenta</Etiqueta>
          <p className="text-[15px] font-semibold text-marca">Valentía Gratis</p>
          <p className="text-[13px] leading-relaxed text-texto/60">
            Si querés trabajar un sueño como Proyecto de Valentía durante 90 días, podés pasar a Premium cuando
            quieras.
          </p>
          <Link href="/membresia" className="inline-block rounded-full bg-marca px-5 py-2.5 text-[13px] font-semibold text-white">
            Sumarme a Premium →
          </Link>
        </div>
      )}

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
