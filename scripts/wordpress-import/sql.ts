import type { RegistroContenido } from "./normalizar";

function valorSql(v: string | number | null): string {
  if (v === null) return "null";
  if (typeof v === "number") return String(v);
  return `'${v.replace(/'/g, "''")}'`;
}

// Un INSERT ... ON CONFLICT por registro (en vez de un solo INSERT
// multi-fila) a propósito: son ~50 filas, no miles — más fácil de leer,
// revisar y ejecutar a mano o de a partes desde una conexión externa.
// `estado` NUNCA se pisa en el conflicto: si Admin ya publicó o cambió el
// estado de este contenido en una corrida anterior, re-importar no debe
// "desnpublicarlo" de vuelta a borrador.
export function generarSql(registros: RegistroContenido[]): string {
  const encabezado = `-- Generado por scripts/importar-wordpress.ts — ${new Date().toISOString()}
-- Ejecutar en el SQL Editor de Supabase (o vía psql) DESPUÉS de aplicar
-- supabase/migrations/0008_migracion_wordpress.sql.
-- Idempotente: corrida dos veces no duplica (upsert por wp_post_id) y no
-- pisa el estado si ya fue publicado/reorganizado a mano.
`;

  const sentencias = registros.map((r) => {
    const columnas = [
      "wp_post_id",
      "tipo",
      "titulo",
      "descripcion",
      "contenido_html",
      "video_url",
      "audio_url",
      "duracion",
      "etapa_wp",
      "modulo_wp",
      "orden_wp",
      "fecha_publicacion_original",
      "estado",
    ];
    const valores = [
      r.wp_post_id,
      r.tipo,
      r.titulo,
      r.descripcion,
      r.contenido_html,
      r.video_url,
      r.audio_url,
      r.duracion,
      r.etapa_wp,
      r.modulo_wp,
      r.orden_wp,
      r.fecha_publicacion_original,
      r.estado,
    ].map(valorSql);

    return `-- ${r.titulo} (wp_post_id=${r.wp_post_id}, ${r._origen})
insert into contenidos (${columnas.join(", ")})
values (${valores.join(", ")})
on conflict (wp_post_id) do update set
  tipo = excluded.tipo,
  titulo = excluded.titulo,
  descripcion = excluded.descripcion,
  contenido_html = excluded.contenido_html,
  video_url = excluded.video_url,
  audio_url = excluded.audio_url,
  duracion = excluded.duracion,
  etapa_wp = excluded.etapa_wp,
  modulo_wp = excluded.modulo_wp,
  orden_wp = excluded.orden_wp,
  fecha_publicacion_original = excluded.fecha_publicacion_original,
  actualizado_en = now();`;
  });

  return `${encabezado}\n${sentencias.join("\n\n")}\n`;
}
