import { csvAObjetos } from "./csv";
import { extraerItems } from "./xml";
import {
  decodificarEntidades,
  limpiarHtmlWordPress,
  extraerAudioEmbebido,
  extraerVideoEmbebido,
  extraerDuracion,
  textoPlanoDesdeHtml,
} from "./html";

export interface RegistroContenido {
  wp_post_id: number;
  tipo: "clase" | "meditacion" | "lectura";
  titulo: string;
  descripcion: string | null;
  contenido_html: string | null;
  video_url: string | null;
  audio_url: string | null;
  duracion: string | null;
  etapa_wp: string | null;
  modulo_wp: string | null;
  orden_wp: number | null;
  fecha_publicacion_original: string | null;
  estado: "borrador";
  // Solo para el reporte — no es una columna de la base.
  _origen: "ruta_premium" | "lectura_publicada" | "lectura_borrador";
}

export interface RegistroIgnorado {
  titulo: string;
  wp_post_id: number | null;
  motivo: string;
}

export interface ResultadoNormalizacion {
  registros: RegistroContenido[];
  ignorados: RegistroIgnorado[];
  incompletos: RegistroIgnorado[];
}

function fechaIso(fecha: string): string | null {
  const d = new Date(fecha.trim().replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// El primer párrafo "real" del cuerpo (no la línea de duración sola, no
// vacío) — se usa como `descripcion` de Ruta Premium, tal como pide el
// brief ("conservar... descripción"). Si no hay ninguno (caso típico de
// los videos, donde el único párrafo ES la duración), se deja null: no se
// inventa una descripción que WordPress nunca tuvo.
function derivarDescripcionRuta(htmlLimpio: string): string | null {
  const parrafos = [...htmlLimpio.matchAll(/<p>([\s\S]*?)<\/p>/g)]
    .map((m) => textoPlanoDesdeHtml(m[1]))
    .filter((t) => t.length > 0);
  // Un párrafo que solo dice la duración (con o sin el emoji de reloj
  // adelante, ej. "🕛 25 minutos") es corto y no aporta nada como
  // descripción — se excluye por longitud + patrón, no por posición.
  const esSoloDuracion = (p: string) => p.length < 20 && /\d+\s*min(uto)?s?\b/i.test(p);
  const real = parrafos.find((p) => !esSoloDuracion(p) && !/^duraci[oó]n estimada/i.test(p));
  return real ?? null;
}

export function normalizarRutaPremium(csvTexto: string): ResultadoNormalizacion {
  const filas = csvAObjetos(csvTexto);
  const registros: RegistroContenido[] = [];
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
    const contenidoHtml = limpiarHtmlWordPress(contenidoRaw);
    const textoPlano = textoPlanoDesdeHtml(contenidoRaw);

    const registro: RegistroContenido = {
      wp_post_id: wpPostId,
      tipo: esVideo ? "clase" : "meditacion",
      titulo,
      descripcion: derivarDescripcionRuta(contenidoHtml),
      contenido_html: contenidoHtml || null,
      video_url: videoUrl,
      audio_url: audioUrl,
      duracion: extraerDuracion(textoPlano),
      etapa_wp: (fila["Categorías"] ?? "").trim() || null,
      modulo_wp: (fila["Etiquetas"] ?? "").trim() || null,
      orden_wp: i + 1,
      fecha_publicacion_original: fila.Date ? fechaIso(fila.Date) : null,
      estado: "borrador",
      _origen: "ruta_premium",
    };
    registros.push(registro);

    if (!esVideo && !audioUrl) {
      incompletos.push({
        titulo,
        wp_post_id: wpPostId,
        motivo: "Meditación sin audio embebido reconocible en el contenido — importada como borrador incompleto, completar el audio desde Admin.",
      });
    }
  });

  return { registros, ignorados, incompletos };
}

export function normalizarLecturas(xmlTexto: string): ResultadoNormalizacion {
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
      video_url: null,
      audio_url: null,
      duracion: null,
      etapa_wp: null,
      modulo_wp: null,
      orden_wp: null,
      fecha_publicacion_original: item.postDate ? fechaIso(item.postDate) : null,
      estado: "borrador",
      _origen: item.status === "publish" ? "lectura_publicada" : "lectura_borrador",
    });
  }

  return { registros, ignorados, incompletos: [] };
}
