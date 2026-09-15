// Tipos compartidos entre server actions, páginas y Admin. Un solo lugar
// para el enum de áreas: agregar una futura experiencia nunca requiere
// tocar el modelo de datos de Mi Proyecto, solo elegir un área existente
// (o pedir una nueva acá).
export const AREAS_RESPUESTA = [
  "sueno",
  "para_que",
  "punto_partida",
  "identidad",
  "decision",
  "estandar",
  "resultado_90_dias",
  "hito",
  "movimiento",
  "libre",
] as const;

export type AreaRespuesta = (typeof AREAS_RESPUESTA)[number];

export const ETIQUETA_AREA: Record<AreaRespuesta, string> = {
  sueno: "Mi sueño",
  para_que: "Mi para qué",
  punto_partida: "Mi punto de partida",
  identidad: "Identidad que estoy practicando",
  decision: "Estándares y decisiones",
  estandar: "Estándares y decisiones",
  resultado_90_dias: "Resultado a los 90 días",
  hito: "Hitos",
  movimiento: "Movimiento",
  libre: "Otras respuestas",
};

export const NIVELES_ACCESO = ["gratis", "membresia"] as const;
export type NivelAcceso = (typeof NIVELES_ACCESO)[number];

export const ESTADOS_EXPERIENCIA = ["borrador", "publicado", "archivado"] as const;
export type EstadoExperiencia = (typeof ESTADOS_EXPERIENCIA)[number];

export type Nivel = "gratis" | "premium";
export type Rol = "miembro" | "editor" | "admin";

// ---------- Biblioteca / CMS ----------
export const TIPOS_CONTENIDO = ["clase", "meditacion", "audio", "plantilla", "recurso", "taller_grabado"] as const;
export type TipoContenido = (typeof TIPOS_CONTENIDO)[number];

export const ETIQUETA_TIPO_CONTENIDO: Record<TipoContenido, string> = {
  clase: "Clase",
  meditacion: "Meditación",
  audio: "Audio",
  plantilla: "Plantilla",
  recurso: "Recurso descargable",
  taller_grabado: "Taller grabado",
};

// contenido_ubicaciones.contexto — dónde puede aparecer un mismo contenido
// sin duplicarlo: suelto en Biblioteca, colgado de una Etapa del método, o
// dentro de un Módulo de un Curso.
export const CONTEXTOS_UBICACION = ["biblioteca", "etapa", "modulo"] as const;
export type ContextoUbicacion = (typeof CONTEXTOS_UBICACION)[number];

export const ETIQUETA_CONTEXTO: Record<ContextoUbicacion, string> = {
  biblioteca: "Biblioteca",
  etapa: "Una etapa del método",
  modulo: "Un módulo de curso",
};

// Estados de publicación reutilizados por Contenidos, Cursos y Eventos.
// El esquema permite además 'programado' (publicación con fecha), pero acá
// no se expone todavía: no hay nada que la publique sola en esa fecha.
export const ESTADOS_CMS = ["borrador", "publicado", "archivado"] as const;
export type EstadoCms = (typeof ESTADOS_CMS)[number];

export interface Pregunta {
  id: string;
  experiencia_id: string;
  texto: string;
  placeholder: string | null;
  area_respuesta: AreaRespuesta;
  orden: number;
}

export interface Experiencia {
  id: string;
  etapa_id: string | null;
  titulo: string;
  descripcion: string | null;
  texto_intro: string | null;
  video_url: string | null;
  nivel_acceso: NivelAcceso;
  estado: EstadoExperiencia;
  orden: number;
}
