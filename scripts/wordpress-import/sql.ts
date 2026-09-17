import type { RegistroContenido, RegistroExperiencia } from "./normalizar";

function valorSql(v: string | number | null): string {
  if (v === null) return "null";
  if (typeof v === "number") return String(v);
  return `'${v.replace(/'/g, "''")}'`;
}

// Lecturas y reflexiones → contenidos (sin cambios respecto a la
// migración anterior: esto sigue siendo correcto). Un INSERT ... ON
// CONFLICT por fila — son ~30, no miles — más fácil de revisar y correr
// de a partes desde una conexión externa. `estado` nunca se pisa en el
// conflicto: si ya se publicó a mano, re-importar no debe re-borradorearla.
export function generarSqlLecturas(registros: RegistroContenido[]): string {
  const encabezado = `-- Lecturas y reflexiones — generado por scripts/importar-wordpress.ts — ${new Date().toISOString()}
-- Ejecutar DESPUÉS de supabase/migrations/0008_migracion_wordpress.sql.
-- Idempotente (upsert por wp_post_id), no pisa \`estado\`.
`;

  const sentencias = registros.map((r) => {
    const columnas = ["wp_post_id", "tipo", "titulo", "descripcion", "contenido_html", "fecha_publicacion_original", "estado"];
    const valores = [r.wp_post_id, r.tipo, r.titulo, r.descripcion, r.contenido_html, r.fecha_publicacion_original, r.estado].map(valorSql);
    return `-- ${r.titulo} (wp_post_id=${r.wp_post_id}, ${r._origen})
insert into contenidos (${columnas.join(", ")})
values (${valores.join(", ")})
on conflict (wp_post_id) do update set
  titulo = excluded.titulo,
  descripcion = excluded.descripcion,
  contenido_html = excluded.contenido_html,
  fecha_publicacion_original = excluded.fecha_publicacion_original,
  actualizado_en = now();`;
  });

  return `${encabezado}\n${sentencias.join("\n\n")}\n`;
}

// Ruta Premium → experiencias + preguntas_experiencia. Acá NO alcanza un
// simple upsert por wp_post_id: hay que fusionar con una experiencia que
// Melisa ya haya creado a mano (ej. "Diseño de tu nueva identidad", en
// CONSTRUÍTE, con preguntas propias) sin duplicarla ni pisarle la etapa,
// el estado, el nivel de acceso, el orden ni las preguntas existentes.
// Por eso cada fila es un bloque PL/pgSQL: busca por wp_post_id primero
// (re-corridas), después por título (fusión con algo creado a mano), y
// recién si no encuentra nada, inserta una experiencia nueva — siempre
// sin asignarle ninguna etapa (eso lo decide Melisa desde Admin).
export function generarSqlExperiencias(experiencias: RegistroExperiencia[]): string {
  const encabezado = `-- Ruta Premium (Experiencias) — generado por scripts/importar-wordpress.ts — ${new Date().toISOString()}
-- Ejecutar DESPUÉS de supabase/migrations/0009_experiencias_ruta_premium.sql.
--
-- Por cada una de las 19 filas del CSV:
--   1. Busca una experiencia existente por wp_post_id (re-corridas) o,
--      si no hay, por título exacto (case/espacios-insensible) entre las
--      que todavía no tienen wp_post_id asignado — para fusionarse con
--      algo creado a mano en vez de duplicarlo.
--   2. Si la encuentra: completa SOLO los campos que estén NULL
--      (COALESCE) — nunca pisa etapa_id, estado, nivel_acceso ni orden
--      ya fijados a mano.
--   3. Si no existe ninguna: la crea en borrador, nivel_acceso=membresia,
--      etapa_id NULL (sin asignar), es_recorrido_entrada=false.
--   4. Preguntas: inserta solo las que no existan ya para esa experiencia
--      (comparando texto normalizado) — nunca borra ni duplica.
--
-- Seguro de correr dos veces sin duplicar nada ni pisar trabajo manual.
`;

  const bloques = experiencias.map((e) => {
    const valoresPreguntas = e.preguntas
      .map((texto, i) => `    (${i + 1}, ${valorSql(texto)})`)
      .join(",\n");

    return `-- ${e.titulo} (wp_post_id=${e.wp_post_id}, ${e.tipo}, ${e.preguntas.length} pregunta(s))
DO $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM experiencias WHERE wp_post_id = ${e.wp_post_id};
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM experiencias
    WHERE wp_post_id IS NULL
      AND lower(trim(titulo)) = lower(trim(${valorSql(e.titulo)}));
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO experiencias (
      wp_post_id, tipo, titulo, texto_intro, video_url, audio_url, duracion,
      etapa_wp, modulo_wp, orden, nivel_acceso, estado, es_recorrido_entrada
    )
    VALUES (
      ${e.wp_post_id}, ${valorSql(e.tipo)}, ${valorSql(e.titulo)}, ${valorSql(e.textoIntro)},
      ${valorSql(e.videoUrl)}, ${valorSql(e.audioUrl)}, ${valorSql(e.duracion)},
      ${valorSql(e.etapaWp)}, ${valorSql(e.moduloWp)}, ${e.ordenCsv}, 'membresia', 'borrador', false
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE experiencias SET
      wp_post_id = COALESCE(wp_post_id, ${e.wp_post_id}),
      tipo = COALESCE(tipo, ${valorSql(e.tipo)}),
      texto_intro = COALESCE(texto_intro, ${valorSql(e.textoIntro)}),
      video_url = COALESCE(video_url, ${valorSql(e.videoUrl)}),
      audio_url = COALESCE(audio_url, ${valorSql(e.audioUrl)}),
      duracion = COALESCE(duracion, ${valorSql(e.duracion)}),
      etapa_wp = COALESCE(etapa_wp, ${valorSql(e.etapaWp)}),
      modulo_wp = COALESCE(modulo_wp, ${valorSql(e.moduloWp)})
    WHERE id = v_id;
  END IF;
${
  e.preguntas.length > 0
    ? `
  INSERT INTO preguntas_experiencia (experiencia_id, orden, texto, area_respuesta)
  SELECT v_id, q.orden, q.texto, 'libre'
  FROM (VALUES
${valoresPreguntas}
  ) AS q(orden, texto)
  WHERE NOT EXISTS (
    SELECT 1 FROM preguntas_experiencia pe
    WHERE pe.experiencia_id = v_id
      AND lower(regexp_replace(pe.texto, '\\s+', ' ', 'g')) = lower(regexp_replace(q.texto, '\\s+', ' ', 'g'))
  );`
    : ""
}
END $$;`;
  });

  return `${encabezado}\n${bloques.join("\n\n")}\n`;
}

// Paso 2, EN ARCHIVO APARTE a propósito — correr SOLO después de
// confirmar que las 19 experiencias se crearon/completaron bien. Cada
// DELETE lleva su propio guard: solo borra un `contenidos` migrado si ya
// existe una `experiencias` con ese mismo wp_post_id (o sea, si la
// conversión para esa fila puntual salió bien) — nunca un DELETE a ciegas
// por lista de tipos.
export function generarSqlLimpiezaContenidos(wpPostIds: number[]): string {
  return `-- Limpieza de contenidos migrados por error a Biblioteca — generado por
-- scripts/importar-wordpress.ts — ${new Date().toISOString()}
--
-- ATENCIÓN: correr esto SOLO después de confirmar en Admin que las 19
-- experiencias de Ruta Premium quedaron bien creadas/completadas. Cada
-- fila de contenidos se borra únicamente si YA existe una experiencia
-- con el mismo wp_post_id — nunca un DELETE genérico por tipo, y nunca
-- toca las 28 lecturas (esas no tienen wp_post_id en esta lista).
delete from contenidos
where wp_post_id in (${wpPostIds.join(", ")})
  and exists (
    select 1 from experiencias e where e.wp_post_id = contenidos.wp_post_id
  );
`;
}
