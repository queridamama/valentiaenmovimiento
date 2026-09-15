import { crearClienteServidor } from "@/lib/supabase/server";
import Link from "next/link";

export default async function InicioPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sueno } = await supabase
    .from("suenos")
    .select("id, descripcion")
    .eq("usuario_id", user?.id)
    .eq("estado", "activo")
    .maybeSingle();

  return (
    <main className="mx-auto max-w-md space-y-6 px-6 py-10">
      <h1 className="font-display text-2xl">Hola{user?.user_metadata?.nombre ? `, ${user.user_metadata.nombre}` : ""}</h1>

      {sueno ? (
        <div className="rounded-card border border-acentoSuave p-4">
          <p className="text-sm text-texto/60">Tu sueño</p>
          <p className="mt-1">{sueno.descripcion}</p>
          <Link href="/mi-sueno" className="mt-3 inline-block text-sm text-acento">
            Ver mi sueño →
          </Link>
        </div>
      ) : (
        <div className="rounded-card border border-acentoSuave p-4">
          <p>Todavía no declaraste tu sueño.</p>
          <Link href="/mi-sueno" className="mt-3 inline-block text-sm text-acento">
            Declarar mi sueño →
          </Link>
        </div>
      )}
    </main>
  );
}
