// Importador de contenido del WordPress anterior → Ruta Premium /
// Biblioteca / Lecturas y reflexiones. Ver PWA... digo, ver el resumen que
// imprime este mismo script para el detalle de qué hace cada modo.
//
// Uso:
//   tsx scripts/importar-wordpress.ts --csv <ruta> --xml <ruta> [opciones]
//
// Opciones:
//   --csv <ruta>       Export de meditaciones/clases (CSV de WordPress).
//   --xml <ruta>       Export completo de WordPress (WXR / .xml).
//   --out-json <ruta>  Escribe los registros normalizados (archivo
//                      intermedio) — no toca ninguna base de datos.
//   --out-sql <ruta>   Genera un .sql idempotente (upsert por
//                      wp_post_id) para correr desde otra conexión con
//                      acceso real a Supabase — tampoco toca nada acá.
//   --execute          Conecta a Supabase (SUPABASE_SECRET_KEY +
//                      NEXT_PUBLIC_SUPABASE_URL, vía .env.local) y
//                      escribe de verdad. SIN esta bandera el script
//                      SIEMPRE es dry-run: solo lee los archivos de
//                      origen y muestra el reporte, no abre ninguna
//                      conexión de red.
//
// Ejemplos:
//   npm run importar:wordpress -- --csv export.csv --xml export.xml
//   npm run importar:wordpress -- --csv export.csv --xml export.xml --out-sql importar.sql --out-json importar.json
//   npm run importar:wordpress -- --csv export.csv --xml export.xml --execute

import { readFileSync, writeFileSync } from "node:fs";
import { normalizarRutaPremium, normalizarLecturas, type RegistroContenido, type RegistroIgnorado } from "./wordpress-import/normalizar";
import { generarSql } from "./wordpress-import/sql";

interface Args {
  csv?: string;
  xml?: string;
  outJson?: string;
  outSql?: string;
  execute: boolean;
}

function parsearArgs(argv: string[]): Args {
  const args: Args = { execute: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--csv") args.csv = argv[++i];
    else if (a === "--xml") args.xml = argv[++i];
    else if (a === "--out-json") args.outJson = argv[++i];
    else if (a === "--out-sql") args.outSql = argv[++i];
    else if (a === "--execute") args.execute = true;
  }
  return args;
}

function imprimirResumen(
  registros: RegistroContenido[],
  ignorados: RegistroIgnorado[],
  incompletos: RegistroIgnorado[]
) {
  const videos = registros.filter((r) => r.tipo === "clase").length;
  const meditaciones = registros.filter((r) => r.tipo === "meditacion").length;
  const lecturasPublicadas = registros.filter((r) => r._origen === "lectura_publicada").length;
  const borradoresHistoricos = registros.filter((r) => r._origen === "lectura_borrador").length;

  console.log("\n========== RESUMEN DE LA IMPORTACIÓN ==========\n");
  console.log(`VIDEOS DE RUTA PREMIUM: ${videos}`);
  console.log(`MEDITACIONES: ${meditaciones}`);
  console.log(`LECTURAS PUBLICADAS IMPORTADAS COMO BORRADOR: ${lecturasPublicadas}`);
  console.log(`BORRADORES HISTÓRICOS CONSERVADOS: ${borradoresHistoricos}`);
  console.log(`AUDIOS SIN ARCHIVO ASOCIADO: ${incompletos.length}`);
  console.log(`CONTENIDOS IGNORADOS DEL WORDPRESS: ${ignorados.length}`);

  if (incompletos.length > 0) {
    console.log("\n--- Audios sin archivo asociado (importados igual, como borrador incompleto) ---");
    incompletos.forEach((i) => console.log(`  · ${i.titulo} (wp_post_id=${i.wp_post_id}) — ${i.motivo}`));
  }

  if (ignorados.length > 0) {
    console.log("\n--- Contenidos ignorados (no se importan) ---");
    ignorados.forEach((i) => console.log(`  · ${i.titulo} (wp_post_id=${i.wp_post_id ?? "—"}) — ${i.motivo}`));
  }

  console.log("\n--- Detalle Ruta Premium (etapa/módulo de origen, para reorganizar desde Admin) ---");
  registros
    .filter((r) => r._origen === "ruta_premium")
    .forEach((r) =>
      console.log(
        `  ${String(r.orden_wp).padStart(2, "0")}. [${r.tipo === "clase" ? "video" : "meditación"}] ${r.titulo} — ${r.etapa_wp ?? "—"} / ${r.modulo_wp ?? "—"}${r.duracion ? ` · ${r.duracion}` : ""}`
      )
    );

  console.log("\n================================================\n");
}

async function ejecutarContraSupabase(registros: RegistroContenido[]) {
  // Import dinámico a propósito: si nadie pide --execute, esta rama nunca
  // corre y no hace falta que dotenv/supabase-js estén siquiera
  // resueltos para el modo dry-run.
  const { createClient } = await import("@supabase/supabase-js");
  const dotenv = await import("dotenv");
  dotenv.config({ path: ".env.local" });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SECRET_KEY en .env.local — --execute necesita las credenciales reales del proyecto (service role, para poder escribir contenido en borrador sin ubicaciones, que RLS no deja tocar con una key pública)."
    );
  }

  const supabase = createClient(url, secretKey);

  console.log(`\nConectando a ${url} y escribiendo ${registros.length} contenidos (upsert por wp_post_id)...\n`);

  const columnas = registros.map((r) => ({
    wp_post_id: r.wp_post_id,
    tipo: r.tipo,
    titulo: r.titulo,
    descripcion: r.descripcion,
    contenido_html: r.contenido_html,
    video_url: r.video_url,
    audio_url: r.audio_url,
    duracion: r.duracion,
    etapa_wp: r.etapa_wp,
    modulo_wp: r.modulo_wp,
    orden_wp: r.orden_wp,
    fecha_publicacion_original: r.fecha_publicacion_original,
    estado: r.estado,
  }));

  // Nunca pisar `estado`: si esta fila ya fue publicada/reorganizada a
  // mano en una corrida anterior, una re-importación no debe devolverla a
  // borrador. Se logra separando insert (primera vez) de update parcial
  // (filas que ya existen) en vez de un upsert con ignoreDuplicates.
  const { data: existentes } = await supabase.from("contenidos").select("id, wp_post_id").not("wp_post_id", "is", null);
  const idsExistentesPorWp = new Map((existentes ?? []).map((e) => [e.wp_post_id as number, e.id as string]));

  const nuevos = columnas.filter((c) => !idsExistentesPorWp.has(c.wp_post_id));
  const aActualizar = columnas.filter((c) => idsExistentesPorWp.has(c.wp_post_id));

  if (nuevos.length > 0) {
    const { error } = await supabase.from("contenidos").insert(nuevos);
    if (error) throw error;
  }

  for (const c of aActualizar) {
    const { estado: _estadoIgnorado, ...sinEstado } = c;
    const { error } = await supabase
      .from("contenidos")
      .update({ ...sinEstado, actualizado_en: new Date().toISOString() })
      .eq("wp_post_id", c.wp_post_id);
    if (error) throw error;
  }

  console.log(`Listo: ${nuevos.length} creados, ${aActualizar.length} actualizados (estado no modificado en los ya existentes).\n`);
}

async function main() {
  const args = parsearArgs(process.argv.slice(2));

  if (!args.csv || !args.xml) {
    console.error("Uso: tsx scripts/importar-wordpress.ts --csv <ruta.csv> --xml <ruta.xml> [--out-json <ruta>] [--out-sql <ruta>] [--execute]");
    process.exit(1);
  }

  const csvTexto = readFileSync(args.csv, "utf-8");
  const xmlTexto = readFileSync(args.xml, "utf-8");

  const ruta = normalizarRutaPremium(csvTexto);
  const lecturas = normalizarLecturas(xmlTexto);

  const registros = [...ruta.registros, ...lecturas.registros];
  const ignorados = [...ruta.ignorados, ...lecturas.ignorados];
  const incompletos = ruta.incompletos;

  imprimirResumen(registros, ignorados, incompletos);

  if (args.outJson) {
    writeFileSync(args.outJson, JSON.stringify({ registros, ignorados, incompletos }, null, 2), "utf-8");
    console.log(`Archivo intermedio (normalizado) escrito en: ${args.outJson}`);
  }

  if (args.outSql) {
    writeFileSync(args.outSql, generarSql(registros), "utf-8");
    console.log(`SQL de importación escrito en: ${args.outSql}`);
  }

  if (args.execute) {
    await ejecutarContraSupabase(registros);
  } else {
    console.log("Modo dry-run: no se escribió nada en ninguna base de datos. Agregá --execute para importar de verdad.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
