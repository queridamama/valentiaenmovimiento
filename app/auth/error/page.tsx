import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const regresoSinCodigo = estado === "confirmacion";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl">
        {regresoSinCodigo ? "¡Ya podés intentar ingresar!" : "No pudimos validar este enlace"}
      </h1>
      <p className="text-texto/70">
        {regresoSinCodigo
          ? "Tu correo puede haberse confirmado correctamente. Iniciá sesión con el email y la contraseña que elegiste para continuar en Valentía."
          : "El enlace pudo haber vencido o haberse usado antes. Si ya confirmaste tu correo, podés iniciar sesión con normalidad. Si todavía no podés entrar, solicitá un nuevo enlace."}
      </p>
      <Link href="/login" className="text-acento">
        Iniciar sesión →
      </Link>
    </main>
  );
}
