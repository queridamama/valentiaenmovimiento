"use client";

import { useState } from "react";
import { TarjetaPaso, COLORES_PASO } from "@/components/tarjetas";
import type { TipoIcono } from "@/components/iconos";

const ICONOS_PASO: TipoIcono[] = ["estrella", "corazon", "montana", "documento"];

interface ExperienciaRuta {
  id: string;
  titulo: string;
  descripcion: string | null;
  completada: boolean;
  tipo?: "clase" | "meditacion";
}

interface EtapaRuta {
  id: string;
  nombre: string;
  orden: number;
  experiencias: ExperienciaRuta[];
}

function Chevron({ abierta }: { abierta: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform duration-200 ${abierta ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// La etapa actual y todas las anteriores ya se "alcanzaron" — deben poder
// volver a abrirse para reentrar a experiencias, escuchar meditaciones de
// nuevo o revisar respuestas, aunque el Proyecto ya haya avanzado. Solo
// las etapas futuras (orden mayor a la actual) quedan bloqueadas. Esto es
// puramente de navegación: no toca etapa_actual ni el progreso real.
export default function RutaPremiumAcordeon({ etapas, etapaActualId }: { etapas: EtapaRuta[]; etapaActualId: string | null }) {
  const etapaActualOrden = etapas.find((e) => e.id === etapaActualId)?.orden ?? 0;
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set(etapaActualId ? [etapaActualId] : []));

  function alternar(etapaId: string) {
    setAbiertas((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(etapaId)) siguiente.delete(etapaId);
      else siguiente.add(etapaId);
      return siguiente;
    });
  }

  return (
    <div className="space-y-4">
      {etapas.map((etapa) => {
        const esActual = etapa.id === etapaActualId;
        const accesible = etapa.orden <= etapaActualOrden;
        const abierta = accesible && abiertas.has(etapa.id);
        const hechas = etapa.experiencias.filter((e) => e.completada).length;

        return (
          <div key={etapa.id} className="space-y-3">
            <button
              type="button"
              onClick={() => alternar(etapa.id)}
              disabled={!accesible}
              aria-expanded={accesible ? abierta : undefined}
              className={`flex w-full items-center justify-between gap-3 rounded-[22px] p-4 text-left transition ${
                esActual ? "bg-marca text-white" : accesible ? "bg-texto/5" : "cursor-default bg-texto/5 opacity-50"
              }`}
            >
              <div className="min-w-0">
                <p className="text-[15px] font-bold tracking-wide">{etapa.nombre}</p>
                <p className={`text-xs ${esActual ? "text-white/70" : "text-texto/50"}`}>
                  {accesible
                    ? `${etapa.experiencias.length} experiencia${etapa.experiencias.length === 1 ? "" : "s"}${
                        etapa.experiencias.length > 0 ? ` · ${hechas} hecha${hechas === 1 ? "" : "s"}` : ""
                      }`
                    : "Se abre más adelante"}
                </p>
              </div>
              {accesible && <Chevron abierta={abierta} />}
            </button>

            {abierta && etapa.experiencias.length > 0 && (
              <div className="flex flex-col gap-6 pl-2">
                {etapa.experiencias.map((e, i) => (
                  <TarjetaPaso
                    key={e.id}
                    numero={String(i + 1).padStart(2, "0")}
                    titulo={e.titulo}
                    descripcion={e.descripcion}
                    estado={e.completada ? "hecha" : "ahora"}
                    color={COLORES_PASO[i % COLORES_PASO.length]}
                    icono={ICONOS_PASO[i % ICONOS_PASO.length]}
                    href={`/experiencias/${e.id}`}
                    clicable
                    tipo={e.tipo}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
