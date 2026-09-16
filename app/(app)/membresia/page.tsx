import Link from "next/link";
import { Subtitulo, Subrayado, Etiqueta } from "@/components/ui";
import { IconoPastel } from "@/components/iconos";
import type { TipoIcono } from "@/components/iconos";

const ETAPAS: { nombre: string; texto: string; icono: TipoIcono }[] = [
  { nombre: "DEFINÍ", texto: "Tu sueño, tu para qué y de dónde partís.", icono: "estrella" },
  { nombre: "CONSTRUÍTE", texto: "La identidad que vas a practicar.", icono: "corazon" },
  { nombre: "DISEÑÁ", texto: "Tu estrategia y tus decisiones.", icono: "documento" },
  { nombre: "MOVETE", texto: "Un movimiento por semana, con miedo y todo.", icono: "pasos" },
  { nombre: "SOSTENÉ", texto: "Hitos, evidencias y revisiones del camino.", icono: "montana" },
];

const PASTELES = ["bg-acento/20", "bg-acentoLima/30", "bg-acentoCeleste/45", "bg-acentoRosa", "bg-acento/20"];

const INCLUYE: { title: string; meta: string; icono: TipoIcono }[] = [
  { title: "Tu Proyecto de Valentía de 90 días", meta: "Sueño, para qué, resultado e hitos en un documento vivo", icono: "documento" },
  { title: "La ruta completa del método", meta: "Definí · Construíte · Diseñá · Movete · Sostené", icono: "pasos" },
  { title: "Identidad, estrategia e hitos", meta: "Las experiencias que hoy no podés abrir", icono: "estrella" },
  { title: "Revisiones de los días 30, 60 y 90", meta: "Para ver el paso del tiempo con datos tuyos", icono: "calendario" },
  { title: "Comunidad completa y encuentros en vivo", meta: "Un encuentro mensual y meditación semanal", icono: "gente" },
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
      <div className="relative overflow-hidden bg-gradient-to-br from-acento/70 via-acentoRosa/60 to-acentoCeleste/60 px-5 pb-9 pt-4">
        <Link href="/inicio" className="inline-block rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-marca backdrop-blur">
          ← Atrás
        </Link>
        <div className="pt-8">
          <Etiqueta className="text-marca/70">Premium</Etiqueta>
          <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.08] text-marca">
            Convertí tu sueño en un Proyecto de Valentía
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-marca/75">
            Gratis mantenés tu sueño en movimiento. Premium lo convertís en un proyecto y lo construís, con método,
            durante noventa días.
          </p>
        </div>
      </div>

      <div className="space-y-10 px-5 pt-8">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-marca">Qué es el Proyecto de Valentía</h2>
          <Subtitulo>
            No es una lista de tareas ni un curso más. Es un documento vivo — tu sueño, tu para qué, la identidad que
            estás practicando y las decisiones que vas tomando — que se va escribiendo solo, semana a semana, con lo
            que vos misma respondés.
          </Subtitulo>
          <p className="font-medium italic text-marca">&ldquo;No es más contenido. Es una ruta.&rdquo;</p>
        </section>

        <section className="space-y-2 rounded-[28px] bg-marca p-7 text-center text-white">
          <p className="font-display text-6xl font-bold">
            <Subrayado color="lima">90</Subrayado>
          </p>
          <p className="text-[15px] font-medium">días, un método, cinco etapas</p>
          <p className="text-[13px] leading-relaxed text-white/70">Empiezan el día que entrás. No hay que esperar al lunes que viene.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-marca">Las cinco etapas</h2>
          <div className="space-y-2.5">
            {ETAPAS.map((etapa, i) => (
              <div key={etapa.nombre} className={`flex items-center gap-4 rounded-[22px] ${PASTELES[i]} p-4`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-marcador text-sm text-marca">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold tracking-wide text-marca">{etapa.nombre}</p>
                  <p className="text-sm text-marca/65">{etapa.texto}</p>
                </div>
                <IconoPastel tipo={etapa.icono} color="blanco" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-marca">Qué incluye Premium</h2>
          <ul className="space-y-2.5">
            {INCLUYE.map((item, i) => (
              <li key={item.title} className={`flex items-start gap-3 rounded-[22px] ${PASTELES[i % PASTELES.length]} p-4`}>
                <IconoPastel tipo={item.icono} color="blanco" />
                <div className="min-w-0">
                  <p className="text-[14.5px] font-bold text-marca">{item.title}</p>
                  <p className="text-[13px] text-marca/60">{item.meta}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-marca">Gratis vs. Premium</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 rounded-[22px] bg-texto/5 p-4">
              <Etiqueta className="!text-texto/45">Gratis</Etiqueta>
              <p className="text-sm font-medium text-texto/80">Mantené tu sueño en movimiento</p>
              <ul className="space-y-1.5 pt-1">
                {GRATIS_BULLETS.map((b) => (
                  <li key={b} className="text-xs text-texto/55">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 rounded-[22px] bg-marca p-4 text-white">
              <Etiqueta className="!text-white/70">Premium</Etiqueta>
              <p className="text-sm font-medium">Construilo en 90 días</p>
              <ul className="space-y-1.5 pt-1">
                {PREMIUM_BULLETS.map((b) => (
                  <li key={b} className="text-xs text-white/80">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-marca">Para que quede claro</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 rounded-[22px] bg-acento/15 p-4">
              <Etiqueta className="!text-marca/50">Esto no es</Etiqueta>
              <ul className="space-y-1.5">
                {NO_ES.map((n) => (
                  <li key={n} className="text-xs text-marca/60">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 rounded-[22px] bg-acentoLima/30 p-4">
              <Etiqueta>Esto sí es</Etiqueta>
              <ul className="space-y-1.5">
                {SI_ES.map((s) => (
                  <li key={s} className="text-xs font-medium text-marca">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-1 rounded-[24px] bg-acentoRosa/50 p-6 text-center">
            <p className="text-3xl font-bold text-marca">$22.000</p>
            <p className="text-sm text-marca/60">por mes</p>
          </div>
          <Subtitulo className="text-center">
            Podés cancelar cuando quieras. Los 90 días empiezan el día que entrás.
          </Subtitulo>
          <div className="space-y-2 rounded-[24px] bg-acento/15 p-5 text-center">
            <p className="text-[15px] font-medium text-marca">Muy pronto vas a poder sumarte acá mismo con Mercado Pago.</p>
            <Subtitulo>Mientras tanto, escribile a tu equipo de Valentía en Movimiento y te activan la cuenta.</Subtitulo>
          </div>
        </section>
      </div>
    </main>
  );
}
