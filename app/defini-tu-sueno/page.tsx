import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { Badge, Etiqueta, Subtitulo, Titulo } from "@/components/ui";

const EXPERIENCIA_ID = "6bc74743-21cd-42ff-9ac9-6808dbf3d176";

export default async function DefiniTuSuenoPage() {
  const servicio = crearClienteServicio();
  const { data: experiencia } = await servicio
    .from("experiencias")
    .select("id, titulo, descripcion, portada_url, estado, nivel_acceso")
    .eq("id", EXPERIENCIA_ID)
    .eq("estado", "publicado")
    .eq("nivel_acceso", "gratis")
    .maybeSingle();

  if (!experiencia) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 text-center">
        <Etiqueta>Valentía en Movimiento</Etiqueta>
        <Titulo>Esta experiencia todavía no está disponible</Titulo>
      </main>
    );
  }

  const destino = `/experiencias/${EXPERIENCIA_ID}`;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(destino);

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-12 pt-8">
      <div className="space-y-6">
        {experiencia.portada_url && (
          // eslint-disable-next-line @next/next/no-img-element -- viene del CMS
          <img
            src={experiencia.portada_url}
            alt=""
            className="aspect-[16/10] w-full rounded-[28px] object-cover"
          />
        )}

        <div className="space-y-3">
          <Badge tipo="gratis" />
          <Etiqueta>DEFINÍ · Valentía en Movimiento</Etiqueta>
          <Titulo>Definí tu sueño</Titulo>
          {experiencia.descripcion && <Subtitulo>{experiencia.descripcion}</Subtitulo>}
        </div>

        <div className="rounded-card border border-marca/15 bg-marca/5 p-5">
          <p className="text-[15px] font-semibold text-marca">La grabación y el PDF están adentro de la app.</p>
          <p className="mt-2 text-sm leading-relaxed text-texto/60">
            Crear tu cuenta es gratis. Después de registrarte volvés automáticamente a esta experiencia.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href={`/registro?redirect=${encodeURIComponent(destino)}`}
            className="block w-full rounded-full bg-marca px-6 py-4 text-center text-[15px] font-semibold text-white"
          >
            Entrar gratis
          </Link>
          <Link
            href={`/login?redirect=${encodeURIComponent(destino)}`}
            className="block w-full rounded-full border border-texto/15 px-6 py-4 text-center text-[15px] font-semibold text-texto"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </main>
  );
}
