"use client";

import { useState } from "react";
import { AREAS_RESPUESTA, ETIQUETA_AREA, TIPOS_EXPERIENCIA, ETIQUETA_TIPO_EXPERIENCIA, type AreaRespuesta, type TipoExperiencia } from "@/lib/tipos";
import EditorEnriquecido from "@/components/admin/EditorEnriquecido";
import CampoArchivo from "@/components/admin/CampoArchivo";

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
    audio_url: string;
    duracion: string;
    tipo: TipoExperiencia;
    portada_url: string;
    etapa_id: string | null;
    nivel_acceso: string;
    estado: string;
    orden: number;
    wp_post_id?: number | null;
    etapa_wp?: string | null;
    modulo_wp?: string | null;
  };
  preguntasIniciales?: PreguntaEditable[];
}

// Único formulario para crear y editar: la lista de preguntas vive en
// estado de cliente (agregar/quitar/reordenar sin recargar) y se manda al
// server action como un solo campo JSON — así la action no tiene que lidiar
// con nombres de campo indexados.
export default function FormularioExperiencia({ accion, etapas, inicial, preguntasIniciales }: Props) {
  // `preguntasIniciales` puede ser legítimamente [] (una experiencia
  // existente sin preguntas, ej. un video) — eso hay que respetarlo tal
  // cual. La pregunta vacía por default es SOLO para el formulario de
  // "nueva experiencia", donde `preguntasIniciales` ni siquiera se pasa
  // (es `undefined`). Antes, `?.length` trataba `[]` igual que
  // `undefined` y le pegaba una pregunta vacía a cualquier experiencia
  // sin preguntas — guardarExperiencia() después rechazaba eso con "La
  // pregunta 1 no puede estar vacía", así que un video sin preguntas
  // nunca se podía guardar ni publicar.
  const [preguntas, setPreguntas] = useState<PreguntaEditable[]>(
    preguntasIniciales !== undefined
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

      {inicial?.wp_post_id && (
        <div className="space-y-1 rounded-card border border-acento/25 bg-acento/5 p-4 text-sm">
          <p className="font-semibold text-acento">Origen: migración de WordPress</p>
          <p className="text-texto/60">
            Post original #{inicial.wp_post_id}
            {inicial.etapa_wp ? ` · Etapa vieja: ${inicial.etapa_wp}` : ""}
            {inicial.modulo_wp ? ` · Módulo/tag viejo: ${inicial.modulo_wp}` : ""}
          </p>
          <p className="text-xs italic text-texto/40">Solo referencia — la etapa real se elige más abajo.</p>
        </div>
      )}

      <div className="grid gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Tipo</span>
          <select name="tipo" defaultValue={inicial?.tipo ?? "clase"} className="rounded-lg border border-texto/15 px-3 py-2">
            {TIPOS_EXPERIENCIA.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_EXPERIENCIA[t]}
              </option>
            ))}
          </select>
        </label>

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

        <CampoArchivo
          label="Portada (opcional)"
          name="portada_url"
          destino="portada"
          accept="image/*"
          tipo="imagen"
          valorInicial={inicial?.portada_url ?? ""}
        />

        <EditorEnriquecido name="texto_intro" label="Texto introductorio" contenidoInicial={inicial?.texto_intro ?? ""} />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">URL de video (YouTube, Vimeo o archivo — opcional)</span>
          <input
            name="video_url"
            defaultValue={inicial?.video_url}
            placeholder="https://…"
            className="rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">URL de audio (opcional — para meditaciones)</span>
          <input
            name="audio_url"
            defaultValue={inicial?.audio_url}
            placeholder="https://…"
            className="rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Duración (opcional)</span>
          <input
            name="duracion"
            defaultValue={inicial?.duracion}
            placeholder="Ej: 25 min"
            className="w-40 rounded-lg border border-texto/15 px-3 py-2"
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
