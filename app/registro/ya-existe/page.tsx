import Link from "next/link";
import { redirectSeguro } from "@/lib/url";
import { Titulo, Subtitulo, EnlacePrimario } from "@/components/ui";

export default async function CuentaYaExistePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; redirect?: string }>;
}) {
  const { email, redirect } = await searchParams;
  const redirectValido = redirectSeguro(redirect);

  // Conserva el destino (por ejemplo /membresia, si vino de la landing
  // Premium) al volver a /login desde acá, además del email.
  const paramsLogin = new URLSearchParams();
  if (email) paramsLogin.set("email", email);
  if (redirectValido) paramsLogin.set("redirect", redirectValido);
  const hrefLogin = paramsLogin.toString() ? `/login?${paramsLogin.toString()}` : "/login";

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
