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
