import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { PREMIUM_PLAN, formatearPrecio } from "@/lib/config/premium";
import { TALLER_HACERLE_LUGAR, PROXIMO_ENCUENTRO_ABIERTO } from "@/lib/config/taller-hacerle-lugar";

export default async function LandingPage() {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/inicio");

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-texto">
      <section className="relative overflow-hidden px-6 pb-12 pt-16 text-center">
        <div className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full bg-acento/25" />
        <div className="pointer-events-none absolute -left-20 top-56 h-56 w-56 rounded-full bg-acentoLima/25" />
        <div className="relative mx-auto max-w-2xl space-y-5">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-acento">Valentía en Movimiento</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-marca sm:text-5xl">Tomate tus sueños en serio</h1>
          <p className="mx-auto max-w-xl text-[16px] leading-relaxed text-texto/65">
            Elegí un sueño, empezá a darle lugar en tu vida y hacelo en comunidad. Podés entrar gratis, sumarte a Premium o elegir un encuentro puntual.
          </p>
          <div className="mx-auto flex max-w-sm flex-col gap-3 pt-2">
            <Link href="/registro" className="rounded-full bg-marca px-6 py-4 text-[15px] font-semibold text-white">
              Empezar gratis
            </Link>
            <Link href="/login" className="rounded-full border border-texto/15 bg-white/70 px-6 py-4 text-[15px] font-semibold text-texto">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-5 pb-14">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-marca/50">Para que sea simple</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-marca">Hay tres formas de vivir Valentía</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[26px] bg-acentoRosa/50 p-5">
            <span className="inline-block rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-marca">Gratis</span>
            <h3 className="mt-4 font-display text-xl font-bold text-marca">Entrar a la comunidad</h3>
            <p className="mt-2 text-sm leading-relaxed text-texto/65">
              Tu recorrido inicial, recursos gratuitos, movimiento semanal, comunidad y encuentros abiertos.
            </p>
            <Link href="/registro" className="mt-5 inline-block text-sm font-semibold text-marca">Empezar gratis →</Link>
          </div>

          <div className="rounded-[26px] bg-marca p-5 text-white">
            <span className="inline-block rounded-full bg-acentoLima px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-marca">Premium</span>
            <h3 className="mt-4 font-display text-xl font-bold">Entrar al proceso completo</h3>
            <p className="mt-1 font-display text-2xl font-bold">{formatearPrecio(PREMIUM_PLAN.price)}<span className="text-sm font-medium text-white/55"> / mes</span></p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              La ruta completa del método, herramientas, meditaciones, comunidad Premium y encuentros incluidos.
            </p>
            <Link href="/registro?redirect=%2Fmembresia" className="mt-5 inline-block text-sm font-semibold text-acentoLima">Quiero ser Premium →</Link>
          </div>

          <div className="rounded-[26px] bg-acentoCeleste/45 p-5">
            <span className="inline-block rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-marca">Encuentro puntual</span>
            <h3 className="mt-4 font-display text-xl font-bold text-marca">Venir solo a un intensivo</h3>
            <p className="mt-1 font-display text-2xl font-bold text-marca">{formatearPrecio(TALLER_HACERLE_LUGAR.precio)}</p>
            <p className="mt-2 text-sm leading-relaxed text-texto/65">
              Un pago único por ese encuentro, sin suscripción. Si preferís Premium, el encuentro está incluido.
            </p>
            <Link href={TALLER_HACERLE_LUGAR.landingPath} className="mt-5 inline-block text-sm font-semibold text-marca">Ver el próximo →</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-4 px-5 pb-16">
        <div className="rounded-[30px] bg-acentoRosa/55 p-6 md:p-8">
          <span className="inline-block rounded-full bg-acentoLima px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-marca">Próximo encuentro abierto · Gratis</span>
          <h2 className="mt-4 font-display text-2xl font-bold text-marca">{PROXIMO_ENCUENTRO_ABIERTO.titulo}</h2>
          <p className="mt-2 text-sm font-semibold text-marca">{PROXIMO_ENCUENTRO_ABIERTO.fechaLabel} · {PROXIMO_ENCUENTRO_ABIERTO.horaLabel}</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-texto/65">{PROXIMO_ENCUENTRO_ABIERTO.descripcion}</p>
          <Link href="/registro" className="mt-5 inline-block rounded-full bg-marca px-5 py-3 text-sm font-semibold text-white">
            Entrar gratis a Valentía
          </Link>
        </div>

        <div className="rounded-[30px] bg-acento/20 p-6 md:p-8">
          <span className="inline-block rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-marca">Encuentro Premium</span>
          <h2 className="mt-4 font-display text-2xl font-bold text-marca">{TALLER_HACERLE_LUGAR.titulo}</h2>
          <p className="mt-2 text-sm font-semibold text-marca">{TALLER_HACERLE_LUGAR.fechaLabel} · {TALLER_HACERLE_LUGAR.horaLabel}</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-texto/65">{TALLER_HACERLE_LUGAR.bajada}</p>
          <p className="mt-3 text-sm font-semibold text-marca">
            {formatearPrecio(TALLER_HACERLE_LUGAR.precio)} pago único · o incluido en Premium por {formatearPrecio(PREMIUM_PLAN.price)}/mes.
          </p>
          <Link href={TALLER_HACERLE_LUGAR.landingPath} className="mt-5 inline-block rounded-full bg-marca px-5 py-3 text-sm font-semibold text-white">
            Ver toda la propuesta
          </Link>
        </div>
      </section>
    </main>
  );
}
