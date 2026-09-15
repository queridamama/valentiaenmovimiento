import Link from "next/link";
import { Tarjeta, Titulo, Subtitulo } from "@/components/ui";

const ITEMS = [
  { title: "Tu Proyecto de Valentía de 90 días", meta: "Sueño, para qué, resultado e hitos en un documento vivo" },
  { title: "La ruta completa del método", meta: "Definí · Construíte · Diseñá · Movete · Sostené" },
  { title: "Identidad, estrategia e hitos", meta: "Las experiencias que hoy no podés abrir" },
  { title: "Revisiones de los días 30, 60 y 90", meta: "Para ver el paso del tiempo con datos tuyos" },
  { title: "Comunidad completa y encuentros en vivo", meta: "Un encuentro mensual y meditación semanal" },
];

export default function MembresiaPage() {
  return (
    <main className="mx-auto max-w-md space-y-6 px-6 pt-10 pb-10">
      <Link href="/inicio" className="text-sm text-texto/50">
        ← Atrás
      </Link>

      <div className="space-y-2">
        <Titulo>Membresía</Titulo>
        <Subtitulo>Tu Proyecto de Valentía de 90 días</Subtitulo>
        <Subtitulo>
          El método completo, con fechas, revisiones y un lugar donde queda todo lo que vas decidiendo.
        </Subtitulo>
      </div>

      <ul className="space-y-2">
        {ITEMS.map((item) => (
          <li key={item.title} className="rounded-card border border-texto/10 bg-tarjeta p-4">
            <p className="text-[15px] font-medium">{item.title}</p>
            <p className="text-sm text-texto/50">{item.meta}</p>
          </li>
        ))}
      </ul>

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
    </main>
  );
}
