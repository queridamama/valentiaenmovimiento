"use client";

import { useState } from "react";
import { AREAS_RESPUESTA, ETIQUETA_AREA, type AreaRespuesta } from "@/lib/tipos";
import EditorEnriquecido from "@/components/admin/EditorEnriquecido";

interface PreguntaEditable {
  id?: string;
  texto: string;
  placeholder: string;
  area_respuesta: AreaRespuesta;
  orden: number;
}

interface Props {
  accion: (formData: FormData) => void;
  etapas: { id: string; nombre: string }[];
  inicial?: {
    titulo: string;
    descripcion: string;
    texto_intro: string;
    video_url: string;
    etapa_id: string | null;
    nivel_acceso: string;
    estado: string;
    orden: number;
  };
  preguntasIniciales?: PreguntaEditable[];
}

// Único formulario para crear y editar: la lista de preguntas vive en
// estado de cliente (agregar/quitar/reordenar sin recargar) y se manda al
// server action como un solo campo JSON — así la action no tiene que lidiar
// con nombres de campo indexados.
export default function FormularioExperiencia({ accion, etapas, inicial, preguntasIniciales }: Props) {
  const [preguntas, setPreguntas] = useState<PreguntaEditable[]>(
    preguntasIniciales?.length
      ? preguntasIniciales
      : [{ texto: "", placeholder: "", area_respuesta: "libre", orden: 1 }]
  );

  function actualizarPregunta(i: number, campo: keyof PreguntaEditable, valor: string | number) {
    setPreguntas((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }

  function agregarPregunta() {
    setPreguntas((prev) => [...prev, { texto: "", placeholder: "", area_respuesta: "libre", orden: prev.length + 1 }]);
  }

  function quitarPregunta(i: number) {
    setPreguntas((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <form action={accion} className="space-y-6">
      <input type="hidden" name="preguntas_json" value={JSON.stringify(preguntas)} />

      <div className="grid gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Título</span>
          <input
            name="titulo"
            defaultValue={inicial?.titulo}
            required
            className="rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Descripción corta</span>
          <input
            name="descripcion"
            defaultValue={inicial?.descripcion}
            className="rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>

        <EditorEnriquecido name="texto_intro" label="Texto introductorio" contenidoInicial={inicial?.texto_intro ?? ""} />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">URL de video (opcional)</span>
          <input
            name="video_url"
            defaultValue={inicial?.video_url}
            placeholder="https://…"
            className="rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Etapa</span>
          <select name="etapa_id" defaultValue={inicial?.etapa_id ?? ""} className="rounded-lg border border-texto/15 px-3 py-2">
            <option value="">Recorrido de entrada (Mi Sueño, sin etapa)</option>
            {etapas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Acceso</span>
            <select name="nivel_acceso" defaultValue={inicial?.nivel_acceso ?? "gratis"} className="rounded-lg border border-texto/15 px-3 py-2">
              <option value="gratis">Gratis</option>
              <option value="membresia">Premium (membresía)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-texto/70">Estado</span>
            <select name="estado" defaultValue={inicial?.estado ?? "borrador"} className="rounded-lg border border-texto/15 px-3 py-2">
              <option value="borrador">Borrador</option>
              <option value="publicado">Publicado</option>
              <option value="archivado">Archivado</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Orden dentro del recorrido/etapa</span>
          <input
            type="number"
            name="orden"
            defaultValue={inicial?.orden ?? 1}
            className="w-24 rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium">Preguntas</p>
          <button type="button" onClick={agregarPregunta} className="text-sm font-medium text-acento">
            + Agregar pregunta
          </button>
        </div>

        {preguntas.map((p, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-texto/15 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-texto/40">Pregunta {i + 1}</span>
              <button type="button" onClick={() => quitarPregunta(i)} className="text-xs text-alerta">
                Quitar
              </button>
            </div>
            <input
              value={p.texto}
              onChange={(e) => actualizarPregunta(i, "texto", e.target.value)}
              placeholder="Texto de la pregunta"
              className="w-full rounded-lg border border-texto/15 px-3 py-2 text-sm"
            />
            <input
              value={p.placeholder}
              onChange={(e) => actualizarPregunta(i, "placeholder", e.target.value)}
              placeholder="Placeholder (opcional)"
              className="w-full rounded-lg border border-texto/15 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={p.area_respuesta}
                onChange={(e) => actualizarPregunta(i, "area_respuesta", e.target.value)}
                className="rounded-lg border border-texto/15 px-3 py-2 text-sm"
              >
                {AREAS_RESPUESTA.map((a) => (
                  <option key={a} value={a}>
                    {ETIQUETA_AREA[a]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={p.orden}
                onChange={(e) => actualizarPregunta(i, "orden", Number(e.target.value))}
                className="rounded-lg border border-texto/15 px-3 py-2 text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <button type="submit" className="rounded-full bg-acento px-6 py-3 text-sm font-semibold text-white">
        Guardar
      </button>
    </form>
  );
}
