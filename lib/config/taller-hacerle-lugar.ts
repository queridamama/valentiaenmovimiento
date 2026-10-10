export const TALLER_HACERLE_LUGAR = {
  key: "hacerle_lugar_a_tu_sueno",
  conceptoPago: "taller_hacerle_lugar",
  titulo: "Hacéle lugar a tu sueño",
  bajada: "Convertí lo que hoy definiste en un proyecto de 90 días que entre en tu vida real y puedas sostener.",
  precio: 45000,
  moneda: "ARS" as const,
  fechaIso: "2026-10-13T23:00:00.000Z",
  fechaLabel: "martes 13 de octubre",
  horaLabel: "20 hs",
  eventoId: "414c967a-2bc1-470c-a7a0-7a8c02f1da5f",
  landingPath: "/hacerle-lugar-a-tu-sueno",
  accesoPath: "/hacerle-lugar-a-tu-sueno/acceso",
  resultadoPath: "/hacerle-lugar-a-tu-sueno/resultado",
} as const;

export const PROXIMO_ENCUENTRO_ABIERTO = {
  titulo: "Encuentro abierto · Valentía en Movimiento",
  descripcion: "Un espacio para volver a tu sueño, encontrarnos y seguir construyendo en comunidad.",
  fechaIso: "2026-11-10T23:00:00.000Z",
  fechaLabel: "martes 10 de noviembre",
  horaLabel: "20 hs",
} as const;

export function referenciaPagoTaller(usuarioId: string): string {
  return `${TALLER_HACERLE_LUGAR.key}:${usuarioId}`;
}
