import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerAutorizacion } from "@/lib/datos";
import { PREMIUM_PLAN, formatearPrecio } from "@/lib/config/premium";
import { TALLER_HACERLE_LUGAR } from "@/lib/config/taller-hacerle-lugar";
import BotonComprarTaller from "@/components/BotonComprarTaller";
import { Etiqueta, Subrayado } from "@/components/ui";

export default async function HacerleLugarPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const autorizacion = user ? await obtenerAutorizacion(supabase, user.id) : null;
  const esPremium = autorizacion?.nivel === "premium";

  const { data: compra } = user
    ? await supabase
        .from("pagos")
        .select("id")
        .eq("usuario_id", user.id)
        .eq("concepto", TALLER_HACERLE_LUGAR.conceptoPago)
        .eq("estado", "approved")
        .limit(1)
        .maybeSingle()
    : { data: null };

  const yaTieneLugar = esPremium || Boolean(compra);
  const hrefPremium = user ? "/membresia" : `/registro?redirect=${encodeURIComponent("/membresia")}`;

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-texto">
      <section className="relative overflow-hidden px-5 pb-12 pt-8">
        <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-acento/25 blur-sm" />
        <div className="pointer-events-none absolute -left-16 top-56 h-48 w-48 rounded-full bg-acentoLima/30 blur-sm" />

        <div className="relative mx-auto max-w-2xl">
          <Link href="/" className="inline-block rounded-full border border-texto/10 bg-white/80 px-4 py-2 text-xs font-semibold text-marca">
            ← Valentía en Movimiento
          </Link>

          <div className="mt-10 space-y-5 text-center">
            <span className="inline-block rounded-full bg-acentoLima px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-marca">
              Encuentro en vivo · {TALLER_HACERLE_LUGAR.fechaLabel} · {TALLER_HACERLE_LUGAR.horaLabel}
            </span>
            <h1 className="font-display text-4xl font-bold leading-[1.04] text-marca sm:text-5xl">
              Hacéle lugar a <Subrayado color="marca">tu sueño</Subrayado>
            </h1>
            <p className="mx-auto max-w-xl text-[17px] leading-relaxed text-texto/70">
              {TALLER_HACERLE_LUGAR.bajada}
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-xl rounded-[30px] bg-acento/18 p-6 sm:p-8">
            <p className="font-display text-2xl font-bold text-marca">Tu sueño no necesita que hagas más cosas.</p>
            <p className="mt-3 text-[15px] leading-relaxed text-texto/70">
              Necesita un lugar real. Tiempo, decisiones y una forma de entrar en la vida que ya tenés, sin esperar a que todo se ordene primero.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-texto/70">
              En este encuentro vamos a tomar eso que querés construir y bajarlo a un proyecto de 90 días que puedas mirar, elegir y sostener.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl space-y-8 px-5 pb-14">
        <div className="space-y-4">
          <Etiqueta>Qué vamos a trabajar</Etiqueta>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Qué tiene que empezar a ocupar lugar de verdad.",
              "Qué necesitás dejar de poner primero para que tu proyecto entre.",
              "Cómo convertir el sueño en decisiones concretas para los próximos 90 días.",
              "Qué movimiento podés empezar a sostener ahora, en tu vida real.",
            ].map((texto) => (
              <div key={texto} className="rounded-[22px] bg-white p-5 text-[14px] leading-relaxed text-texto/70 shadow-sm">
                {texto}
              </div>
            ))}
          </div>
          <p className="rounded-[22px] bg-acentoRosa/55 p-5 text-[14px] leading-relaxed text-marca">
            Vas a tener el encuentro en vivo, una hoja de trabajo para hacerlo conmigo y acceso a la grabación después.
          </p>
        </div>

        <div className="space-y-4">
          <Etiqueta>Elegí cómo querés entrar</Etiqueta>

          <div className="rounded-[28px] border border-texto/10 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-texto/45">Solo este encuentro</p>
            <p className="mt-2 font-display text-3xl font-bold text-marca">{formatearPrecio(TALLER_HACERLE_LUGAR.precio)}</p>
            <p className="text-sm text-texto/50">Pago único · no es una suscripción.</p>
            <p className="mt-4 text-[14px] leading-relaxed text-texto/70">
              Entrás a Hacéle lugar a tu sueño, participás del vivo y después te queda la grabación y el material de este encuentro.
            </p>
            <div className="mt-5">
              {yaTieneLugar ? (
                <Link href={TALLER_HACERLE_LUGAR.accesoPath} className="block w-full rounded-full bg-marca px-6 py-4 text-center text-[15px] font-semibold text-white">
                  Ya tengo mi lugar →
                </Link>
              ) : user ? (
                <BotonComprarTaller />
              ) : (
                <Link
                  href={`/registro?redirect=${encodeURIComponent(TALLER_HACERLE_LUGAR.landingPath)}`}
                  className="block w-full rounded-full bg-marca px-6 py-4 text-center text-[15px] font-semibold text-white"
                >
                  Crear mi cuenta y reservar · $45.000
                </Link>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] bg-marca p-6 text-white">
            <span className="inline-block rounded-full bg-acentoLima px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-marca">
              Este encuentro está incluido
            </span>
            <p className="mt-4 font-display text-2xl font-bold">Valentía Premium</p>
            <p className="mt-1 font-display text-3xl font-bold">{formatearPrecio(PREMIUM_PLAN.price)}<span className="text-base font-medium text-white/60"> / mes</span></p>
            <p className="mt-4 text-[14px] leading-relaxed text-white/75">
              En vez de comprar este encuentro aislado, podés sumarte al proceso completo. Pagás $10.000 menos hoy y Hacéle lugar a tu sueño ya está incluido.
            </p>
            <div className="mt-4 space-y-2 text-[13.5px] text-white/80">
              <p>✓ Este encuentro en vivo.</p>
              <p>✓ La ruta del método dentro de la app.</p>
              <p>✓ Herramientas y meditaciones para sostenerte en el camino.</p>
              <p>✓ Encuentros Premium mientras tu membresía esté activa.</p>
              <p>✓ Comunidad y acompañamiento para seguir trabajando tu proyecto.</p>
            </div>
            <Link href={esPremium ? TALLER_HACERLE_LUGAR.accesoPath : hrefPremium} className="mt-6 block w-full rounded-full bg-acentoLima px-6 py-4 text-center text-[15px] font-semibold text-marca">
              {esPremium ? "Ya soy Premium · entrar al encuentro" : `Quiero Premium · ${formatearPrecio(PREMIUM_PLAN.price)}/mes`}
            </Link>
          </div>

          <div className="rounded-[24px] bg-acentoCeleste/35 p-5">
            <p className="font-semibold text-marca">¿Por qué Premium cuesta menos que comprar el encuentro solo?</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-texto/65">
              Porque son dos decisiones distintas. Los $45.000 son un pago único por este encuentro. Premium es una membresía mensual de $35.000 que se renueva mes a mes: este encuentro está incluido porque forma parte del proceso que hacemos adentro de la comunidad. Si después no querés continuar, podés cancelar la suscripción desde tu perfil.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-[28px] bg-acentoRosa/45 p-6 text-center">
          <p className="font-display text-2xl font-bold text-marca">No tenés que tener todo resuelto para empezar.</p>
          <p className="text-[14px] leading-relaxed text-texto/65">
            Traé tu sueño como está hoy. La idea es justamente hacerle un lugar posible.
          </p>
          <p className="text-sm font-semibold text-marca">{TALLER_HACERLE_LUGAR.fechaLabel} · {TALLER_HACERLE_LUGAR.horaLabel}</p>
        </div>
      </section>
    </main>
  );
}
