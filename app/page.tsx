import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 text-center">
      <div className="max-w-sm space-y-4">
        <p className="text-sm font-medium uppercase tracking-widest text-acento">en movimiento</p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-texto">
          Tomate tus sueños en serio
        </h1>
        <p className="text-[15px] leading-relaxed text-texto/65">
          Elegí un sueño, transformalo en un Proyecto de Valentía y construilo en 90 días, un movimiento por vez.
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link href="/registro" className="rounded-full bg-acento px-6 py-4 text-[15px] font-semibold text-white">
          Empezar gratis
        </Link>
        <Link href="/login" className="rounded-full border border-texto/15 px-6 py-4 text-[15px] font-semibold text-texto">
          Ya tengo cuenta
        </Link>
      </div>
    </main>
  );
}
