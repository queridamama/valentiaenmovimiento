import Link from "next/link";
import { Titulo, Subtitulo, EnlacePrimario } from "@/components/ui";

export default async function CuentaYaExistePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const hrefLogin = email ? `/login?email=${encodeURIComponent(email)}` : "/login";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <Titulo>Este email ya tiene una cuenta</Titulo>
      <Subtitulo>No hace falta esperar otro correo. Iniciá sesión para volver a entrar a Valentía.</Subtitulo>
      <div className="w-full space-y-3 pt-2">
        <EnlacePrimario href={hrefLogin}>Iniciar sesión</EnlacePrimario>
        <Link href="/recuperar" className="block text-center text-sm font-medium text-acento">
          Olvidé mi contraseña
        </Link>
      </div>
    </main>
  );
}
