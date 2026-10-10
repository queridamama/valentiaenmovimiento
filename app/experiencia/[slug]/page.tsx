import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { Badge, Etiqueta, Subtitulo, Titulo } from "@/components/ui";

export default async function ExperienciaCompartiblePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const servicio = crearClienteServicio();

  const { data: experiencia } = await servicio
    .from("experiencias")
    .select("id, titulo, descripcion, portada_url, estado, nivel_acceso")
    .eq("slug", slug)
    .eq("estado", "publicado")
    .maybeSingle();

  if (!experiencia) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 text-center">
        <Etiqueta>Valentía en Movimiento</Etiqueta>
        <Titulo>Esta experiencia todavía no está disponible</Titulo>
        <Subtitulo>Puede estar en borrador o haber cambiado de lugar.</Subtitulo>
      </main>
    );
  }

  const destino = `/experiencias/${experiencia.id}`;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(destino);

  const gratis = experiencia.nivel_acceso === "gratis";

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-12 pt-8">
      <div className="space-y-6">
        {experiencia.portada_url && (
          // eslint-disable-next-line @next/next/no-img-element -- viene del CMS
          <img src={experiencia.portada_url} alt="" className="aspect-[16/10] w-full rounded-[28px] object-cover" />
        )}

        <div className="space-y-3">
          <Badge tipo={gratis ? "gratis" : "membresia"} />
          <Etiqueta>Valentía en Movimiento</Etiqueta>
          <Titulo>{experiencia.titulo}</Titulo>
          {experiencia.descripcion && <Subtitulo>{experiencia.descripcion}</Subtitulo>}
        </div>

        <div className="rounded-card border border-marca/15 bg-marca/5 p-5">
          <p className="text-[15px] font-semibold text-marca">
            {gratis ? "Esta experiencia es gratuita." : "Esta experiencia forma parte de Premium."}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-texto/60">
            {gratis
              ? "Creá tu cuenta y entrás directo a esta experiencia. Después no tenés que buscarla dentro de la app."
              : "Ingresá con tu cuenta Premium para abrirla directamente."}
          </p>
        </div>

        <div className="space-y-3">
          {gratis && (
            <Link
              href={`/registro?redirect=${encodeURIComponent(destino)}`}
              className="block w-full rounded-full bg-marca px-6 py-4 text-center text-[15px] font-semibold text-white"
            >
              Entrar gratis
            </Link>
          )}
          <Link
            href={`/login?redirect=${encodeURIComponent(destino)}`}
            className={gratis
              ? "block w-full rounded-full border border-texto/15 px-6 py-4 text-center text-[15px] font-semibold text-texto"
              : "block w-full rounded-full bg-marca px-6 py-4 text-center text-[15px] font-semibold text-white"}
          >
            {gratis ? "Ya tengo cuenta" : "Ingresar a Premium"}
          </Link>
        </div>
      </div>
    </main>
  );
}
