import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl">El link ya no es válido</h1>
      <p className="text-texto/70">
        Puede haber expirado o ya haberse usado. Pedí uno nuevo iniciando
        sesión o registrándote de nuevo.
      </p>
      <Link href="/login" className="text-acento">
        Volver a intentar →
      </Link>
    </main>
  );
}
