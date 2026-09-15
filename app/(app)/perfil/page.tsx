import { crearClienteServidor } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PerfilPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Perfil (editable por la usuaria) y autorización (nivel/rol — NUNCA
  // editable por la usuaria, ver supabase/schema.sql) son tablas separadas
  // a propósito. Acá solo se leen, en dos queries, para no mezclar la
  // fuente de verdad de permisos con datos de perfil.
  const [{ data: perfil }, { data: autorizacion }] = await Promise.all([
    supabase.from("perfiles").select("nombre").eq("id", user?.id).maybeSingle(),
    supabase.from("autorizaciones").select("nivel, rol").eq("usuario_id", user?.id).maybeSingle(),
  ]);

  async function cerrarSesion() {
    "use server";
    const supabase = await crearClienteServidor();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-md space-y-6 px-6 py-10">
      <h1 className="font-display text-2xl">Perfil</h1>
      <div className="rounded-card border border-acentoSuave p-4">
        <p>{perfil?.nombre ?? user?.email}</p>
        <p className="text-sm text-texto/60">
          Nivel: {autorizacion?.nivel ?? "gratis"}
        </p>
      </div>
      <form action={cerrarSesion}>
        <button className="rounded-card border border-acento px-6 py-3 text-acento">
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
