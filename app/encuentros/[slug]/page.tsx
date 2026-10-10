import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { Badge, Etiqueta, Subtitulo, Titulo } from "@/components/ui";

export default async function EncuentroCompartiblePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const servicio = crearClienteServicio();

  // La vista pública nunca expone el contenido completo: solo metadatos de
  // algo que además esté publicado y ubicado explícitamente como Biblioteca Gratis.
  const { data: contenido } = await servicio
    .from("contenidos")
    .select("id, titulo, descripcion, portada_url, duracion, tipo, estado")
    .eq("slug", slug)
    .eq("estado", "publicado")
    .maybeSingle();

  if (!contenido) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 text-center">
        <Etiqueta>Valentía en Movimiento</Etiqueta>
        <Titulo>Este encuentro todavía no está disponible</Titulo>
        <Subtitulo>Cuando esté publicado, vas a poder entrar desde este mismo link.</Subtitulo>
        <Link href="/" className="mt-2 text-sm font-semibold text-marca">
          Volver →
        </Link>
      </main>
    );
  }

  const { data: ubicacionGratis } = await servicio
    .from("contenido_ubicaciones")
    .select("id")
    .eq("contenido_id", contenido.id)
    .eq("contexto", "biblioteca")
    .eq("nivel_acceso", "gratis")
    .limit(1)
    .maybeSingle();

  if (!ubicacionGratis) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 text-center">
        <Etiqueta>Valentía en Movimiento</Etiqueta>
        <Titulo>Este encuentro no está disponible como acceso gratuito</Titulo>
        <Link href="/" className="mt-2 text-sm font-semibold text-marca">
          Volver →
        </Link>
      </main>
    );
  }

  const destino = `/biblioteca/${contenido.id}`;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si ya pertenece a la comunidad, el link la deja directamente adentro.
  if (user) redirect(destino);

  const registro = `/registro?redirect=${encodeURIComponent(destino)}`;
  const login = `/login?redirect=${encodeURIComponent(destino)}`;

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-12 pt-8">
      <div className="space-y-6">
        {contenido.portada_url && (
          // eslint-disable-next-line @next/next/no-img-element -- viene del CMS
          <img
            src={contenido.portada_url}
            alt=""
            className="aspect-[16/10] w-full rounded-[28px] object-cover"
          />
        )}

        <div className="space-y-3">
          <Badge tipo="gratis" />
          <Etiqueta>Encuentro abierto · Valentía en Movimiento</Etiqueta>
          <Titulo>{contenido.titulo}</Titulo>
          {contenido.descripcion && <Subtitulo>{contenido.descripcion}</Subtitulo>}
          {contenido.duracion && <p className="text-sm text-texto/45">{contenido.duracion}</p>}
        </div>

        <div className="rounded-card border border-marca/15 bg-marca/5 p-5">
          <p className="text-[15px] font-semibold text-marca">La grabación está adentro de la app.</p>
          <p className="mt-2 text-sm leading-relaxed text-texto/60">
            Crear tu cuenta es gratis. Después de registrarte volvés automáticamente a este encuentro,
            sin tener que buscarlo.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href={registro}
            className="block w-full rounded-full bg-marca px-6 py-4 text-center text-[15px] font-semibold text-white"
          >
            Entrar gratis y ver la grabación
          </Link>
          <Link
            href={login}
            className="block w-full rounded-full border border-texto/15 px-6 py-4 text-center text-[15px] font-semibold text-texto"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </main>
  );
}
