import Link from "next/link";
import { Tarjeta, Subtitulo } from "@/components/ui";

const ETAPAS = [
  { nombre: "DEFINÍ", texto: "Tu sueño, tu para qué y de dónde partís." },
  { nombre: "CONSTRUÍTE", texto: "La identidad que vas a practicar." },
  { nombre: "DISEÑÁ", texto: "Tu estrategia y tus decisiones." },
  { nombre: "MOVETE", texto: "Un movimiento por semana, con miedo y todo." },
  { nombre: "SOSTENÉ", texto: "Hitos, evidencias y revisiones del camino." },
];

const INCLUYE = [
  { title: "Tu Proyecto de Valentía de 90 días", meta: "Sueño, para qué, resultado e hitos en un documento vivo" },
  { title: "La ruta completa del método", meta: "Definí · Construíte · Diseñá · Movete · Sostené" },
  { title: "Identidad, estrategia e hitos", meta: "Las experiencias que hoy no podés abrir" },
  { title: "Revisiones de los días 30, 60 y 90", meta: "Para ver el paso del tiempo con datos tuyos" },
  { title: "Comunidad completa y encuentros en vivo", meta: "Un encuentro mensual y meditación semanal" },
];

const GRATIS_BULLETS = ["Tu sueño declarado", "Un movimiento por semana", "Comunidad abierta", "Contenidos gratuitos"];
const PREMIUM_BULLETS = [
  "Proyecto de Valentía completo",
  "Las cinco etapas del método",
  "Identidad, estrategia e hitos",
  "Revisiones de los días 30, 60 y 90",
  "Comunidad completa y encuentros en vivo",
];

const NO_ES = ["Solo más contenido para mirar", "Una academia de videos", "Motivación vacía"];
const SI_ES = ["Una ruta", "Claridad", "Identidad", "Estrategia", "Decisiones", "Movimiento", "Evidencia"];

export default function MembresiaPage() {
  return (
    <main className="mx-auto max-w-md pb-10">
      {/* Apertura: mismo lenguaje visual que el hero del Home (gradiente de
          marca), pero acá siempre es el mismo — no depende de una imagen
          administrable, así se mantiene simple esta pantalla. */}
      <div className="relative overflow-hidden bg-gradient-to-br from-acento/70 via-acentoRosa/60 to-acentoCeleste/60 px-6 pb-9 pt-6">
        <Link href="/inicio" className="inline-block rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-texto backdrop-blur">
          ← Atrás
        </Link>
        <div className="pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-texto/60">Premium</p>
          <h1 className="mt-2 font-display text-[30px] font-semibold leading-[1.15] text-texto">
            Convertí tu sueño en un Proyecto de Valentía
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-texto/75">
            Gratis mantenés tu sueño en movimiento. Premium lo convertís en un proyecto y lo construís, con método,
            durante noventa días.
          </p>
        </div>
      </div>

      <div className="space-y-10 px-6 pt-8">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Qué es el Proyecto de Valentía</h2>
          <Subtitulo>
            No es una lista de tareas ni un curso más. Es un documento vivo — tu sueño, tu para qué, la identidad que
            estás practicando y las decisiones que vas tomando — que se va escribiendo solo, semana a semana, con lo
            que vos misma respondés.
          </Subtitulo>
          <p className="font-medium italic text-texto">&ldquo;No es más contenido. Es una ruta.&rdquo;</p>
        </section>

        <section className="space-y-4 rounded-card border border-texto/10 bg-tarjeta p-6 text-center">
          <p className="font-display text-5xl font-semibold text-acento">90</p>
          <p className="text-[15px] font-medium text-texto">días, un método, cinco etapas</p>
          <Subtitulo>Empiezan el día que entrás. No hay que esperar al lunes que viene.</Subtitulo>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Las cinco etapas</h2>
          <div className="space-y-2">
            {ETAPAS.map((etapa, i) => (
              <div key={etapa.nombre} className="flex items-start gap-3 rounded-card border border-texto/10 bg-tarjeta p-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-texto/10 text-xs font-bold text-texto/70">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[15px] font-bold tracking-wide">{etapa.nombre}</p>
                  <p className="text-sm text-texto/55">{etapa.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Qué incluye Premium</h2>
          <ul className="space-y-2">
            {INCLUYE.map((item) => (
              <li key={item.title} className="rounded-card border border-texto/10 bg-tarjeta p-4">
                <p className="text-[15px] font-medium">{item.title}</p>
                <p className="text-sm text-texto/50">{item.meta}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Gratis vs. Premium</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 rounded-card border border-texto/10 bg-tarjeta p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-texto/45">Gratis</p>
              <p className="text-sm font-medium text-texto/80">Mantené tu sueño en movimiento</p>
              <ul className="space-y-1.5 pt-1">
                {GRATIS_BULLETS.map((b) => (
                  <li key={b} className="text-xs text-texto/55">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 rounded-card border border-acento/40 bg-acento/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-acentoTeal">Premium</p>
              <p className="text-sm font-medium text-texto">Construilo en 90 días</p>
              <ul className="space-y-1.5 pt-1">
                {PREMIUM_BULLETS.map((b) => (
                  <li key={b} className="text-xs text-texto/70">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Para que quede claro</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 rounded-card bg-texto/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-texto/45">Esto no es</p>
              <ul className="space-y-1.5">
                {NO_ES.map((n) => (
                  <li key={n} className="text-xs text-texto/45">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 rounded-card bg-acentoLima/15 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-acentoTeal">Esto sí es</p>
              <ul className="space-y-1.5">
                {SI_ES.map((s) => (
                  <li key={s} className="text-xs font-medium text-texto/80">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <Tarjeta className="space-y-1 text-center">
            <p className="text-3xl font-semibold">$22.000</p>
            <p className="text-sm text-texto/50">por mes</p>
          </Tarjeta>
          <Subtitulo className="text-center">
            Podés cancelar cuando quieras. Los 90 días empiezan el día que entrás.
          </Subtitulo>
          <div className="space-y-3 rounded-card border border-acento/30 bg-acento/5 p-5 text-center">
            <p className="text-[15px] font-medium">Muy pronto vas a poder sumarte acá mismo con Mercado Pago.</p>
            <Subtitulo>Mientras tanto, escribile a tu equipo de Valentía en Movimiento y te activan la cuenta.</Subtitulo>
          </div>
        </section>
      </div>
    </main>
  );
}
