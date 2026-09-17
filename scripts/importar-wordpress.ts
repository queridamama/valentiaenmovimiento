// Importador de contenido del WordPress anterior:
//   - CSV de la membresía (4 videos + 15 meditaciones) → experiencias +
//     preguntas_experiencia (Ruta Premium — con fusión segura contra
//     experiencias ya creadas a mano, ver scripts/wordpress-import/sql.ts).
//   - XML completo → contenidos tipo 'lectura' (Lecturas y reflexiones en
//     Biblioteca — esta parte no cambió respecto a la migración anterior).
//
// Uso:
//   tsx scripts/importar-wordpress.ts --csv <ruta> --xml <ruta> [opciones]
//
// Opciones:
//   --out-json <ruta>          Datos normalizados (archivo intermedio),
//                              no toca ninguna base de datos.
//   --out-sql-lecturas <ruta>  SQL idempotente para las lecturas
//                              (contenidos, upsert por wp_post_id).
//   --out-sql-experiencias <ruta>
//                              SQL de fusión segura para Ruta Premium
//                              (experiencias + preguntas_experiencia).
//   --out-sql-limpieza <ruta> DELETE de los 19 `contenidos` migrados por
//                              error en la corrida anterior — correr
//                              SOLO después de confirmar la conversión.
//   --execute                 Ejecuta de verdad, pero SOLO la parte de
//                              lecturas (upsert simple y de bajo riesgo).
//                              La parte de experiencias NUNCA se ejecuta
//                              desde acá — la lógica de fusión con
//                              experiencias creadas a mano es demasiado
//                              sensible para un upsert ciego; usá siempre
//                              --out-sql-experiencias y corré ese SQL
//                              desde una conexión con acceso real.
//
// Sin --execute, el script SIEMPRE es dry-run puro: solo lee los archivos
// de origen y muestra el reporte, no abre ninguna conexión de red.

import { readFileSync, writeFileSync } from "node:fs";
import {
  normalizarLecturas,
  normalizarExperienciasRuta,
  TITULOS_EXPERIENCIAS_CONOCIDAS,
  type RegistroContenido,
  type RegistroExperiencia,
  type RegistroIgnorado,
} from "./wordpress-import/normalizar";
import { generarSqlLecturas, generarSqlExperiencias, generarSqlLimpiezaContenidos } from "./wordpress-import/sql";

interface Args {
  csv?: string;
  xml?: string;
  outJson?: string;
  outSqlLecturas?: string;
  outSqlExperiencias?: string;
  outSqlLimpieza?: string;
  execute: boolean;
}

function parsearArgs(argv: string[]): Args {
  const args: Args = { execute: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--csv") args.csv = argv[++i];
    else if (a === "--xml") args.xml = argv[++i];
    else if (a === "--out-json") args.outJson = argv[++i];
    else if (a === "--out-sql-lecturas") args.outSqlLecturas = argv[++i];
    else if (a === "--out-sql-experiencias") args.outSqlExperiencias = argv[++i];
    else if (a === "--out-sql-limpieza") args.outSqlLimpieza = argv[++i];
    else if (a === "--execute") args.execute = true;
  }
  return args;
}

function imprimirResumen(
  lecturas: RegistroContenido[],
  experiencias: RegistroExperiencia[],
  ignorados: RegistroIgnorado[],
  incompletos: RegistroIgnorado[]
) {
  const videos = experiencias.filter((e) => e.tipo === "clase").length;
  const meditaciones = experiencias.filter((e) => e.tipo === "meditacion").length;
  const lecturasPublicadas = lecturas.filter((r) => r._origen === "lectura_publicada").length;
  const borradoresHistoricos = lecturas.filter((r) => r._origen === "lectura_borrador").length;
  const totalPreguntas = experiencias.reduce((acc, e) => acc + e.preguntas.length, 0);

  const conocidas = experiencias.filter((e) => TITULOS_EXPERIENCIAS_CONOCIDAS.includes(e.titulo));
  const nuevasConocidas = experiencias.length - conocidas.length;

  console.log("\n========== RESUMEN DE LA IMPORTACIÓN ==========\n");
  console.log(`VIDEOS DE RUTA PREMIUM: ${videos}`);
  console.log(`MEDITACIONES: ${meditaciones}`);
  console.log(`LECTURAS PUBLICADAS IMPORTADAS COMO BORRADOR: ${lecturasPublicadas}`);
  console.log(`BORRADORES HISTÓRICOS CONSERVADOS: ${borradoresHistoricos}`);
  console.log(`AUDIOS SIN ARCHIVO ASOCIADO: ${incompletos.length}`);
  console.log(`CONTENIDOS IGNORADOS DEL WORDPRESS: ${ignorados.length}`);
  console.log("");
  console.log(`EXPERIENCIAS A CREAR (estimado, sin conexión real): ${nuevasConocidas}`);
  console.log(`EXPERIENCIAS EXISTENTES A COMPLETAR (conocidas desde el código): ${conocidas.length}`);
  console.log(`PREGUNTAS A CREAR: ${totalPreguntas}`);
  console.log(`MEDITACIONES SIN AUDIO: ${incompletos.length}`);
  console.log(`CONTENIDOS ANTIGUOS A ELIMINAR DESPUÉS DE VALIDAR: ${experiencias.length}`);

  if (conocidas.length > 0) {
    console.log("\n--- Coincidencias conocidas (fusión, no duplicado) ---");
    conocidas.forEach((e) => console.log(`  · ${e.titulo} (wp_post_id=${e.wp_post_id}) — ya existe en el código base (migración 0002), el SQL la fusiona.`));
    console.log(
      "  Nota: el SQL generado revisa por título contra TODA tu base real, no solo esta lista — puede haber más coincidencias que no puedo ver desde este entorno."
    );
  }

  if (incompletos.length > 0) {
    console.log("\n--- Meditaciones sin audio (se convierten igual en experiencia, audio_url=null) ---");
    incompletos.forEach((i) => console.log(`  · ${i.titulo} (wp_post_id=${i.wp_post_id}) — ${i.motivo}`));
  }

  if (ignorados.length > 0) {
    console.log("\n--- Contenidos ignorados (no se importan) ---");
    ignorados.forEach((i) => console.log(`  · ${i.titulo} (wp_post_id=${i.wp_post_id ?? "—"}) — ${i.motivo}`));
  }

  console.log("\n--- Detalle Ruta Premium (etapa/módulo de origen, preguntas) ---");
  experiencias.forEach((e) =>
    console.log(
      `  ${String(e.ordenCsv).padStart(2, "0")}. [${e.tipo === "clase" ? "video" : "meditación"}] ${e.titulo} — ${e.etapaWp ?? "—"} / ${e.moduloWp ?? "—"}${e.duracion ? ` · ${e.duracion}` : ""} · ${e.preguntas.length} pregunta(s)`
    )
  );

  console.log("\n================================================\n");
}

async function ejecutarLecturasContraSupabase(registros: RegistroContenido[]) {
  const { createClient } = await import("@supabase/supabase-js");
  const dotenv = await import("dotenv");
  dotenv.config({ path: ".env.local" });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SECRET_KEY en .env.local.");
  }

  const supabase = createClient(url, secretKey);
  console.log(`\nConectando a ${url} y escribiendo ${registros.length} lecturas (upsert por wp_post_id)...\n`);

  const { data: existentes } = await supabase.from("contenidos").select("id, wp_post_id").not("wp_post_id", "is", null);
  const idsExistentesPorWp = new Map((existentes ?? []).map((e) => [e.wp_post_id as number, e.id as string]));

  const columnas = registros.map((r) => ({
    wp_post_id: r.wp_post_id,
    tipo: r.tipo,
    titulo: r.titulo,
    descripcion: r.descripcion,
    contenido_html: r.contenido_html,
    fecha_publicacion_original: r.fecha_publicacion_original,
    estado: r.estado,
  }));

  const nuevos = columnas.filter((c) => !idsExistentesPorWp.has(c.wp_post_id));
  const aActualizar = columnas.filter((c) => idsExistentesPorWp.has(c.wp_post_id));

  if (nuevos.length > 0) {
    const { error } = await supabase.from("contenidos").insert(nuevos);
    if (error) throw error;
  }
  for (const c of aActualizar) {
    const { estado: _estadoIgnorado, ...sinEstado } = c;
    const { error } = await supabase.from("contenidos").update({ ...sinEstado, actualizado_en: new Date().toISOString() }).eq("wp_post_id", c.wp_post_id);
    if (error) throw error;
  }

  console.log(`Listo: ${nuevos.length} lecturas creadas, ${aActualizar.length} actualizadas (estado no modificado en las ya existentes).\n`);
}

async function main() {
  const args = parsearArgs(process.argv.slice(2));

  if (!args.csv || !args.xml) {
    console.error(
      "Uso: tsx scripts/importar-wordpress.ts --csv <ruta.csv> --xml <ruta.xml> [--out-json <ruta>] [--out-sql-lecturas <ruta>] [--out-sql-experiencias <ruta>] [--out-sql-limpieza <ruta>] [--execute]"
    );
    process.exit(1);
  }

  const csvTexto = readFileSync(args.csv, "utf-8");
  const xmlTexto = readFileSync(args.xml, "utf-8");

  const lecturas = normalizarLecturas(xmlTexto);
  const ruta = normalizarExperienciasRuta(csvTexto);

  imprimirResumen(lecturas.registros, ruta.experiencias, [...lecturas.ignorados, ...ruta.ignorados], ruta.incompletos);

  if (args.outJson) {
    writeFileSync(
      args.outJson,
      JSON.stringify({ lecturas: lecturas.registros, experiencias: ruta.experiencias, ignorados: [...lecturas.ignorados, ...ruta.ignorados], incompletos: ruta.incompletos }, null, 2),
      "utf-8"
    );
    console.log(`Archivo intermedio (normalizado) escrito en: ${args.outJson}`);
  }

  if (args.outSqlLecturas) {
    writeFileSync(args.outSqlLecturas, generarSqlLecturas(lecturas.registros), "utf-8");
    console.log(`SQL de lecturas escrito en: ${args.outSqlLecturas}`);
  }

  if (args.outSqlExperiencias) {
    writeFileSync(args.outSqlExperiencias, generarSqlExperiencias(ruta.experiencias), "utf-8");
    console.log(`SQL de experiencias (Ruta Premium, con fusión segura) escrito en: ${args.outSqlExperiencias}`);
  }

  if (args.outSqlLimpieza) {
    writeFileSync(args.outSqlLimpieza, generarSqlLimpiezaContenidos(ruta.experiencias.map((e) => e.wp_post_id)), "utf-8");
    console.log(`SQL de limpieza (contenidos viejos, con guard) escrito en: ${args.outSqlLimpieza} — correr SOLO después de validar las experiencias.`);
  }

  if (args.execute) {
    await ejecutarLecturasContraSupabase(lecturas.registros);
    console.log(
      "La parte de experiencias (Ruta Premium) NO se ejecuta desde acá — usá --out-sql-experiencias y corré ese archivo desde una conexión con acceso real, después de revisarlo."
    );
  } else {
    console.log("Modo dry-run: no se escribió nada en ninguna base de datos. Agregá --execute para importar las lecturas de verdad.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
