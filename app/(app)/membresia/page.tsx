import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerAutorizacion } from "@/lib/datos";
import { Subtitulo, Subrayado, Etiqueta } from "@/components/ui";
import { IconoPastel } from "@/components/iconos";
import type { TipoIcono } from "@/components/iconos";
import { PREMIUM_PLAN, formatearPrecio } from "@/lib/config/premium";
import BotonSuscribirseAlojado from "@/components/BotonSuscribirseAlojado";

const ETAPAS: { nombre: string; texto: string; icono: TipoIcono }[] = [
  { nombre: "DEFINÍ", texto: "Tu sueño, tu para qué y de dónde partís.", icono: "estrella" },
  { nombre: "CONSTRUÍTE", texto: "La identidad que vas a practicar.", icono: "corazon" },
  { nombre: "DISEÑÁ", texto: "Tu estrategia y tus decisiones.", icono: "documento" },
  { nombre: "MOVETE", texto: "Un movimiento por semana, con miedo y todo.", icono: "pasos" },
  { nombre: "SOSTENÉ", texto: "Hitos, evidencias y revisiones del camino.", icono: "montana" },
];

const PASTELES = ["bg-acento/20", "bg-acentoLima/30", "bg-acentoCeleste/45", "bg-acentoRosa", "bg-acento/20"];

// El corazón sigue siendo el método y el acompañamiento — esto es el
// trabajo en sí, no la frecuencia de contenidos (esa vive en "Un ritmo
// para sostenerte", más abajo).
const LO_QUE_VAMOS_A_TRABAJAR: { texto: string; icono: TipoIcono }[] = [
  { texto: "Convertir tu sueño en un Proyecto de Valentía de 90 días.", icono: "documento" },
  { texto: "Diseñar una ruta concreta.", icono: "pasos" },
  { texto: "Trabajar la identidad que necesitás practicar para sostenerlo.", icono: "corazon" },
  { texto: "Tomar decisiones y definir hitos.", icono: "estrella" },
  { texto: "Elegir movimientos semanales posibles en tu vida real.", icono: "montana" },
  { texto: "Registrar evidencias de avance.", icono: "calendario" },
  { texto: "Revisar, ajustar y seguir construyendo.", icono: "corona" },
];

// El ritmo que sostiene la experiencia y la comunidad — no reemplaza al
// método, lo acompaña. Encuentro en vivo: Admin → Eventos (tipo "Taller
// mensual", nivel_acceso Premium — ver obtenerProximoEventoPremium en
// lib/datos.ts). Meditación semanal: Admin → Biblioteca, marcada
// "Meditación de la semana" con su fecha de habilitación (ver
// obtenerMeditacionSemanal).
const RITMO_PREMIUM: { titulo: string; texto: string; icono: TipoIcono; color: string }[] = [
  {
    titulo: "Encuentro en vivo cada mes",
    texto: "Un espacio virtual para encontrarnos, trabajar juntas, conversar sobre el proceso y volver a poner en movimiento lo que necesites.",
    icono: "gente",
    color: "bg-acentoCeleste/45",
  },
  {
    titulo: "Una nueva meditación cada semana",
    texto: "Una práctica nueva para acompañarte en el momento que estés atravesando y seguir construyendo la identidad que necesita tu sueño.",
    icono: "corazon",
    color: "bg-acentoRosa",
  },
];

const GRATIS_BULLETS = [
  "Elegís tu sueño y hacés el recorrido inicial.",
  "Definís tu movimiento de la semana.",
  "Registrás lo que vas logrando.",
  "Biblioteca y recursos gratuitos.",
  "Comunidad abierta dentro de Valentía.",
  "Grupo gratuito de WhatsApp.",
  "Novedades, propuestas y encuentros abiertos.",
];
const PREMIUM_BULLETS = [
  "Todo lo de Gratis.",
  "Tu Proyecto de Valentía de 90 días.",
  "Ruta completa: Definí · Construíte · Diseñá · Movete · Sostené.",
  "Estrategia, hitos y decisiones.",
  "Trabajo de identidad.",
  "Un encuentro virtual en vivo por mes.",
  "Una nueva meditación cada semana.",
  "Clases, meditaciones y preguntas de integración del método.",
  "Comunidad Premium y grupo privado de WhatsApp.",
  "Acompañamiento para implementar, revisar y ajustar tu proyecto.",
];

const NO_ES = ["Solo más contenido para mirar", "Una academia de videos", "Motivación vacía"];
const SI_ES = ["Un método", "Una ruta", "Identidad", "Estrategia", "Decisiones", "Movimiento", "Acompañamiento"];

export default async function MembresiaPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // /membresia ya está en RUTAS_PROTEGIDAS (middleware.ts): si se llegó
  // acá, hay sesión. `user` solo queda null en el resquicio teórico de
  // que la cookie expire entre el middleware y este render.
  if (!user) return null;
  const autorizacion = await obtenerAutorizacion(supabase, user.id);
  const esPremium = autorizacion.nivel === "premium";

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
            Premium es la ruta para tomar un sueño importante, convertirlo en un proyecto y construirlo en tu vida
            real con identidad, estrategia, decisiones y movimiento.
          </p>
        </div>
      </div>

      {esPremium ? (
        <div className="space-y-6 px-5 pt-8">
          <div className="space-y-3 rounded-[28px] bg-marca p-7 text-center text-white">
            <p className="font-display text-2xl font-bold">Ya sos parte de Premium 💜</p>
            <p className="text-[14px] leading-relaxed text-white/75">
              Tu Proyecto de Valentía y toda la ruta ya están disponibles.
            </p>
          </div>
          <div className="space-y-3">
            <Link
              href="/mi-sueno"
              className="block rounded-full bg-marca px-6 py-4 text-center text-[15px] font-semibold text-white"
            >
              Continuar mi Ruta →
            </Link>
            <Link
              href="/mi-proyecto"
              className="block rounded-full border border-marca/20 px-6 py-4 text-center text-[15px] font-semibold text-marca"
            >
              Ver mi Proyecto →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-10 px-5 pt-8">
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-marca">Qué es el Proyecto de Valentía</h2>
            <Subtitulo>
              No es una lista de tareas ni un curso más. Es un documento vivo — tu sueño, tu para qué, la identidad
              que estás practicando y las decisiones que vas tomando — que se va escribiendo solo, semana a semana,
              con lo que vos misma respondés.
            </Subtitulo>
            <p className="font-medium italic text-marca">&ldquo;No es más contenido. Es una ruta.&rdquo;</p>
          </section>

          <section className="space-y-2 rounded-[28px] bg-marca p-7 text-center text-white">
            <p className="font-display text-6xl font-bold">
              <Subrayado color="lima">90</Subrayado>
            </p>
            <p className="text-[15px] font-medium">días de trabajo, un método, cinco etapas</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-marca">Las cinco etapas</h2>
            <Subtitulo>Adentro de cada etapa hay módulos, y adentro de cada módulo, experiencias concretas.</Subtitulo>
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

          {/* Peso visual propio, aparte de "Lo que vamos a trabajar": el
              encuentro en vivo y la meditación semanal son el ritmo que
              sostiene la experiencia, no dos ítems más en una lista larga
              de beneficios. */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-marca">Un ritmo para sostenerte</h2>
            <div className="space-y-3">
              {RITMO_PREMIUM.map((item) => (
                <div key={item.titulo} className={`flex items-start gap-4 rounded-[24px] ${item.color} p-5`}>
                  <IconoPastel tipo={item.icono} color="blanco" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[15.5px] font-bold text-marca">{item.titulo}</p>
                    <p className="text-[13.5px] leading-relaxed text-marca/70">{item.texto}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-marca">Lo que vamos a trabajar</h2>
            <ul className="space-y-2.5">
              {LO_QUE_VAMOS_A_TRABAJAR.map((item, i) => (
                <li key={item.texto} className={`flex items-center gap-3 rounded-[22px] ${PASTELES[i % PASTELES.length]} p-4`}>
                  <IconoPastel tipo={item.icono} color="blanco" />
                  <p className="min-w-0 text-[14.5px] font-medium text-marca">{item.texto}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-marca">Gratis vs. Premium</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 rounded-[22px] bg-texto/5 p-4">
                <Etiqueta className="!text-texto/45">Gratis</Etiqueta>
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
              <p className="text-3xl font-bold text-marca">{formatearPrecio(PREMIUM_PLAN.price)} ARS</p>
              <p className="text-sm text-marca/60">por mes</p>
            </div>
            <Subtitulo className="text-center">
              Trabajás tu sueño en ciclos de 90 días. Tu membresía se renueva mensualmente y podés cancelarla cuando
              quieras.
            </Subtitulo>
            <BotonSuscribirseAlojado />
          </section>
        </div>
      )}
    </main>
  );
}
