import Link from "next/link";

// Landing pública mínima para Fase 0/1. El diseño visual definitivo se hace
// cuando tengamos las referencias de identidad de Melisa (ver STATUS.md).
export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="font-display text-3xl">Tomate tus sueños en serio</h1>
        <p className="text-texto/80">
          Elegí un sueño, transformalo en un Proyecto de Valentía y construilo
          en 90 días, un movimiento por vez.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/registro"
          className="rounded-card bg-acento px-6 py-3 text-fondo"
        >
          Empezar gratis
        </Link>
        <Link
          href="/login"
          className="rounded-card border border-acento px-6 py-3 text-acento"
        >
          Ya tengo cuenta
        </Link>
      </div>
    </main>
  );
}
