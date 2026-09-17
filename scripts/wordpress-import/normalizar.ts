import { csvAObjetos } from "./csv";
import { extraerItems } from "./xml";
import { decodificarEntidades, limpiarHtmlWordPress, extraerAudioEmbebido, extraerVideoEmbebido, extraerDuracion, analizarCuerpoExperiencia } from "./html";

// ---------- Lecturas y reflexiones (XML → contenidos tipo 'lectura') ----------
// Esto NO cambió respecto a la migración anterior — sigue siendo correcto,
// ver el brief de esta corrección: "eso no hay que cambiar".

export interface RegistroContenido {
  wp_post_id: number;
  tipo: "lectura";
  titulo: string;
  descripcion: string | null;
  contenido_html: string | null;
  fecha_publicacion_original: string | null;
  estado: "borrador";
  _origen: "lectura_publicada" | "lectura_borrador";
}

export interface RegistroIgnorado {
  titulo: string;
  wp_post_id: number | null;
  motivo: string;
}

export interface ResultadoLecturas {
  registros: RegistroContenido[];
  ignorados: RegistroIgnorado[];
}

function fechaIso(fecha: string): string | null {
  const d = new Date(fecha.trim().replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function normalizarLecturas(xmlTexto: string): ResultadoLecturas {
  const items = extraerItems(xmlTexto);
  const registros: RegistroContenido[] = [];
  const ignorados: RegistroIgnorado[] = [];

  for (const item of items) {
    if (item.postType !== "post") continue;

    const wpPostId = item.postId ? parseInt(item.postId, 10) : null;
    const titulo = decodificarEntidades(item.title ?? "(sin título)").trim();
    const contenidoRaw = item.contentEncoded ?? "";

    // Señal estructural, no un match por título: un post de texto con un
    // bloque de audio embebido es contenido de prueba (el único caso real
    // encontrado dice literalmente "titulo duracion" / "texto largooooo"),
    // no una reflexión real — se excluye y se deja constancia del motivo.
    if (/<!--\s*wp:audio|<audio[ >]/i.test(contenidoRaw)) {
      ignorados.push({
        titulo,
        wp_post_id: wpPostId,
        motivo: "Contiene un bloque de audio dentro de un post de texto — parece contenido de prueba, no una reflexión real. Revisar manualmente si corresponde.",
      });
      continue;
    }

    if (item.status !== "publish" && item.status !== "draft") {
      ignorados.push({ titulo, wp_post_id: wpPostId, motivo: `Estado "${item.status}" en WordPress — no es ni publicado ni borrador, se ignora.` });
      continue;
    }
    if (!wpPostId) {
      ignorados.push({ titulo, wp_post_id: null, motivo: "Post sin wp:post_id válido." });
      continue;
    }

    registros.push({
      wp_post_id: wpPostId,
      tipo: "lectura",
      titulo,
      descripcion: null,
      contenido_html: limpiarHtmlWordPress(contenidoRaw) || null,
      fecha_publicacion_original: item.postDate ? fechaIso(item.postDate) : null,
      estado: "borrador",
      _origen: item.status === "publish" ? "lectura_publicada" : "lectura_borrador",
    });
  }

  return { registros, ignorados };
}

// ---------- Ruta Premium (CSV → experiencias + preguntas_experiencia) ----------
// Corrección de la migración anterior: estos 19 contenidos NO son
// contenidos sueltos de Biblioteca — son pasos de un recorrido, con
// preguntas de integración que la usuaria responde ahí mismo. Van a
// `experiencias`, el mismo modelo que ya usa Mi Ruta / el Proyecto de
// Valentía — no un sistema paralelo.

export interface RegistroExperiencia {
  wp_post_id: number;
  tipo: "clase" | "meditacion";
  titulo: string;
  textoIntro: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  duracion: string | null;
  etapaWp: string | null;
  moduloWp: string | null;
  // Posición dentro del CSV — se usa como `orden` SOLO si la experiencia
  // es nueva. Si ya existe (por título o wp_post_id), el orden que
  // Melisa ya fijó a mano nunca se toca.
  ordenCsv: number;
  preguntas: string[];
}

export interface ResultadoExperienciasRuta {
  experiencias: RegistroExperiencia[];
  ignorados: RegistroIgnorado[];
  incompletos: RegistroIgnorado[];
}

export function normalizarExperienciasRuta(csvTexto: string): ResultadoExperienciasRuta {
  const filas = csvAObjetos(csvTexto);
  const experiencias: RegistroExperiencia[] = [];
  const ignorados: RegistroIgnorado[] = [];
  const incompletos: RegistroIgnorado[] = [];

  filas.forEach((fila, i) => {
    const wpPostId = parseInt(fila.ID, 10);
    const titulo = decodificarEntidades(fila.Title ?? "").trim();
    const status = (fila.Status ?? "").trim();
    const contenidoRaw = fila.Content ?? "";

    if (status !== "publish") {
      ignorados.push({ titulo, wp_post_id: wpPostId || null, motivo: `Estado "${status}" en WordPress — se ignora, no es contenido publicado.` });
      return;
    }
    if (!Number.isFinite(wpPostId)) {
      ignorados.push({ titulo, wp_post_id: null, motivo: "Fila sin ID de WordPress válido." });
      return;
    }

    const esVideo = /<!--\s*wp:embed/.test(contenidoRaw);
    const videoUrl = esVideo ? extraerVideoEmbebido(contenidoRaw) : null;
    const audioUrl = !esVideo ? extraerAudioEmbebido(contenidoRaw) : null;
    const { textoIntro, preguntas } = analizarCuerpoExperiencia(contenidoRaw);
    const duracion = extraerDuracion(
      // La duración puede estar en el mismo párrafo que luego se descarta
      // como "solo duración" — se busca en el texto plano de TODO el
      // contenido crudo, no en textoIntro (que ya no la tiene).
      contenidoRaw.replace(/<[^>]+>/g, " ")
    );

    experiencias.push({
      wp_post_id: wpPostId,
      tipo: esVideo ? "clase" : "meditacion",
      titulo,
      textoIntro,
      videoUrl,
      audioUrl,
      duracion,
      etapaWp: (fila["Categorías"] ?? "").trim() || null,
      moduloWp: (fila["Etiquetas"] ?? "").trim() || null,
      ordenCsv: i + 1,
      preguntas,
    });

    if (!esVideo && !audioUrl) {
      incompletos.push({
        titulo,
        wp_post_id: wpPostId,
        motivo: "Meditación sin audio embebido reconocible en el contenido — se convierte igual en experiencia (audio_url null), completar desde Admin.",
      });
    }
  });

  return { experiencias, ignorados, incompletos };
}

// Títulos que ya existen como experiencia creada a mano en el código base
// actual (ver supabase/migrations/0002_experiencias.sql) — la única
// coincidencia que puedo confirmar sin conectarme a la base real. El SQL
// generado igual revisa por título contra la base real completa, por si
// hay otras coincidencias que no puedo ver desde acá.
export const TITULOS_EXPERIENCIAS_CONOCIDAS = ["Diseño de tu nueva identidad"];
