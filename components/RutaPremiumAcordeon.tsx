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

interface ModuloRuta {
  id: string;
  titulo: string;
  descripcion: string | null;
  orden: number;
  experiencias: ExperienciaRuta[];
}

interface EtapaRuta {
  id: string;
  nombre: string;
  orden: number;
  modulos: ModuloRuta[];
  experienciasSueltas: ExperienciaRuta[];
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

function ListaExperiencias({ experiencias }: { experiencias: ExperienciaRuta[] }) {
  return (
    <div className="flex flex-col gap-6 pl-2">
      {experiencias.map((e, i) => (
        <TarjetaPaso
          key={e.id}
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
  );
}

// Resumen de un módulo, sin gamificación: cuenta lo que hay y, si ya
// arrancó, cuánto lleva — nunca un tono de "te falta". Solo se ofrece
// "Continuar" cuando ya empezó y todavía no terminó.
function ResumenModulo({ experiencias }: { experiencias: ExperienciaRuta[] }) {
  const total = experiencias.length;
  const hechas = experiencias.filter((e) => e.completada).length;
  const completo = total > 0 && hechas === total;
  const enCurso = hechas > 0 && !completo;
  const texto = completo
    ? `${total} experiencia${total === 1 ? "" : "s"} · completado ✓`
    : hechas > 0
      ? `${hechas} de ${total} realizadas`
      : `${total} experiencia${total === 1 ? "" : "s"}`;
  return (
    <p className="text-xs text-texto/50">
      {texto}
      {enCurso && <span className="ml-1.5 font-semibold text-marca">· Continuar</span>}
    </p>
  );
}

function Modulo({ modulo, abierto, onToggle }: { modulo: ModuloRuta; abierto: boolean; onToggle: () => void }) {
  if (modulo.experiencias.length === 0) return null;
  return (
    <div className="space-y-3 rounded-[20px] bg-white/60 p-3">
      <button type="button" onClick={onToggle} aria-expanded={abierto} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-marca">{modulo.titulo}</p>
          <ResumenModulo experiencias={modulo.experiencias} />
        </div>
        <Chevron abierta={abierto} />
      </button>
      {abierto && <ListaExperiencias experiencias={modulo.experiencias} />}
    </div>
  );
}

// La etapa actual y todas las anteriores ya se "alcanzaron" — deben poder
// volver a abrirse para reentrar a experiencias, escuchar meditaciones de
// nuevo o revisar respuestas, aunque el Proyecto ya haya avanzado. Solo
// las etapas futuras (orden mayor a la actual) quedan bloqueadas. Esto es
// puramente de navegación: no toca etapa_actual ni el progreso real.
//
// Dentro de una etapa accesible, los módulos son secciones colapsables
// propias: por ahora NO hay bloqueo duro entre ellos — cualquier módulo
// se puede abrir aunque otro anterior no esté terminado (eso queda para
// una etapa posterior del producto, ver brief). Por default se abre el
// primer módulo con experiencias pendientes de la etapa actual; el resto
// arranca cerrado pero clicable.
export default function RutaPremiumAcordeon({ etapas, etapaActualId }: { etapas: EtapaRuta[]; etapaActualId: string | null }) {
  const etapaActualOrden = etapas.find((e) => e.id === etapaActualId)?.orden ?? 0;
  const [etapasAbiertas, setEtapasAbiertas] = useState<Set<string>>(() => new Set(etapaActualId ? [etapaActualId] : []));
  const [modulosAbiertos, setModulosAbiertos] = useState<Set<string>>(() => {
    const etapaActual = etapas.find((e) => e.id === etapaActualId);
    const primeroConPendientes = etapaActual?.modulos.find(
      (m) => m.experiencias.length > 0 && m.experiencias.some((e) => !e.completada)
    );
    return new Set(primeroConPendientes ? [primeroConPendientes.id] : []);
  });

  function alternarEtapa(etapaId: string) {
    setEtapasAbiertas((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(etapaId)) siguiente.delete(etapaId);
      else siguiente.add(etapaId);
      return siguiente;
    });
  }

  function alternarModulo(moduloId: string) {
    setModulosAbiertos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(moduloId)) siguiente.delete(moduloId);
      else siguiente.add(moduloId);
      return siguiente;
    });
  }

  return (
    <div className="space-y-4">
      {etapas.map((etapa) => {
        const esActual = etapa.id === etapaActualId;
        const accesible = etapa.orden <= etapaActualOrden;
        const abierta = accesible && etapasAbiertas.has(etapa.id);
        const totalExperiencias = etapa.modulos.reduce((n, m) => n + m.experiencias.length, 0) + etapa.experienciasSueltas.length;
        const hechas =
          etapa.modulos.reduce((n, m) => n + m.experiencias.filter((e) => e.completada).length, 0) +
          etapa.experienciasSueltas.filter((e) => e.completada).length;

        return (
          <div key={etapa.id} className="space-y-3">
            <button
              type="button"
              onClick={() => alternarEtapa(etapa.id)}
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
                    ? totalExperiencias > 0
                      ? `${totalExperiencias} experiencia${totalExperiencias === 1 ? "" : "s"} · ${hechas} hecha${hechas === 1 ? "" : "s"}`
                      : "Todavía no hay contenido acá"
                    : "Se abre más adelante"}
                </p>
              </div>
              {accesible && <Chevron abierta={abierta} />}
            </button>

            {abierta && (
              <div className="flex flex-col gap-3 pl-2">
                {etapa.modulos.map((modulo) => (
                  <Modulo
                    key={modulo.id}
                    modulo={modulo}
                    abierto={modulosAbiertos.has(modulo.id)}
                    onToggle={() => alternarModulo(modulo.id)}
                  />
                ))}
                {etapa.experienciasSueltas.length > 0 && <ListaExperiencias experiencias={etapa.experienciasSueltas} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
