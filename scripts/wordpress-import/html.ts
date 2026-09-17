// Decodifica entidades HTML/XML numéricas y con nombre — el CSV trae
// emojis como referencias numéricas literales (ej. &#x1f55b;) porque no es
// XML real, solo texto plano exportado.
export function decodificarEntidades(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

const TAGS_PERMITIDOS = new Set(["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a", "blockquote", "h1", "h2", "h3", "h4"]);

// Convierte el cuerpo de un post de WordPress (bloques de Gutenberg) en
// HTML simple y seguro: saca comentarios de bloque, shortcodes, y
// cualquier tag/atributo que no esté en la lista blanca. A propósito NO
// resume ni reescribe texto — solo quita "basura técnica", como pide el
// brief de migración.
export function limpiarHtmlWordPress(html: string): string {
  let s = decodificarEntidades(html);

  // Comentarios de bloque: <!-- wp:paragraph {...} --> y <!-- /wp:x -->
  s = s.replace(/<!--[\s\S]*?-->/g, "");

  // Shortcodes tipo [diario_integracion meditacion_id="123"]
  s = s.replace(/\[[^\]\n]*\]/g, "");

  // Bloques de audio/embed completos (con su contenido: el <audio>, o el
  // <div> que solo tiene la URL cruda como texto) — ya se extraen aparte
  // como audio_url/video_url, no deben quedar como texto suelto.
  s = s.replace(/<figure[^>]*class="[^"]*wp-block-audio[^"]*"[^>]*>[\s\S]*?<\/figure>/gi, "");
  s = s.replace(/<figure[^>]*class="[^"]*wp-block-embed[^"]*"[^>]*>[\s\S]*?<\/figure>/gi, "");

  // Tags peligrosos o irrelevantes, con su contenido.
  s = s.replace(/<(script|style|iframe|audio|video|form|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, "");
  s = s.replace(/<(script|style|iframe|audio|video|form|object|embed)[^>]*\/?>/gi, "");

  // <a>: se normaliza aparte (solo href http(s), con target/rel seguros)
  // antes de pasar por el filtro genérico de abajo.
  s = s.replace(/<a\s+[^>]*href="([^"]*)"[^>]*>/gi, (_, href: string) => {
    const segura = /^https?:\/\//i.test(href) ? href : "#";
    return `<a href="${segura}" target="_blank" rel="noopener noreferrer">`;
  });

  // Filtro genérico: cualquier tag que no esté en la lista blanca
  // desaparece (se conserva el texto de alrededor); los que sí están
  // permitidos pierden cualquier atributo que no sea el href ya
  // normalizado de <a>.
  s = s.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (completo, cierre: string, nombreTag: string, _attrs) => {
    const tag = nombreTag.toLowerCase();
    if (!TAGS_PERMITIDOS.has(tag)) return "";
    if (tag === "a") return completo;
    return `<${cierre}${tag}>`;
  });

  // Párrafos vacíos (WordPress deja varios seguidos al final de cada post).
  s = s.replace(/<p>(?:\s|<br\s*\/?>)*<\/p>/gi, "");

  // Colapsar espacios en blanco sobrantes entre bloques.
  s = s.replace(/\n{3,}/g, "\n\n").trim();

  return s;
}

// Extrae la URL del <audio src="..."> embebido — el que efectivamente se
// reproducía en el post, no cualquiera de los adjuntos históricos que
// pueda listar la columna "Attachment URL" del CSV.
export function extraerAudioEmbebido(htmlOriginal: string): string | null {
  const m = htmlOriginal.match(/<audio[^>]*\bsrc="([^"]+)"/i);
  return m ? decodificarEntidades(m[1]) : null;
}

// Extrae la URL de un embed de YouTube/Vimeo (wp:embed) desde el texto
// plano del wrapper — más simple y confiable que parsear el JSON del
// comentario del bloque (que trae barras y "&" escapados).
export function extraerVideoEmbebido(htmlOriginal: string): string | null {
  const m = htmlOriginal.match(/<div class="wp-block-embed__wrapper">\s*([\s\S]*?)\s*<\/div>/i);
  if (!m) return null;
  return decodificarEntidades(m[1].trim());
}

// "🕛 25 minutos" → "25 min"; "Duración estimada del Video: 35min | ..."
// → "35 min". "00 minutos" es un placeholder sin completar en el
// WordPress original, no una duración real — se descarta (nunca se
// inventa un valor).
export function extraerDuracion(textoPlano: string): string | null {
  const m = textoPlano.match(/(\d+)\s*min/i);
  if (!m) return null;
  const minutos = parseInt(m[1], 10);
  if (minutos <= 0) return null;
  return `${minutos} min`;
}

export function textoPlanoDesdeHtml(html: string): string {
  return decodificarEntidades(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

const MARCA_PREGUNTA = "🔸";

function esParrafoSoloDuracion(textoPlano: string): boolean {
  return (
    (textoPlano.length < 20 && /\d+\s*min(uto)?s?\b/i.test(textoPlano)) ||
    /^duraci[oó]n estimada/i.test(textoPlano)
  );
}

export interface CuerpoExperiencia {
  // HTML limpio (p/br/strong/etc.) con SOLO la explicación real — nunca la
  // línea de duración, nunca las preguntas, nunca el shortcode. null si el
  // post no tenía ningún párrafo de explicación (caso típico de los 4
  // videos, donde el único texto es la duración).
  textoIntro: string | null;
  // Una entrada por línea que empezaba con 🔸 (o &#x1f538; ya decodificado
  // a ese mismo carácter), en el orden en que aparecían, con el símbolo
  // sacado y el resto del texto EXACTO — nunca reescrito.
  preguntas: string[];
}

// Separa el cuerpo de una meditación/clase del CSV en sus tres partes
// reales: intro, preguntas de integración, y "basura" (duración,
// shortcode, bloques de audio/embed, párrafos vacíos) — para que ninguna
// termine pegada a texto_intro por error.
export function analizarCuerpoExperiencia(contenidoRaw: string): CuerpoExperiencia {
  const htmlLimpio = limpiarHtmlWordPress(contenidoRaw);
  const parrafos = [...htmlLimpio.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => m[1]);

  const preguntas: string[] = [];
  const parrafosIntro: string[] = [];

  for (const p of parrafos) {
    if (p.includes(MARCA_PREGUNTA)) {
      for (const linea of p.split(/<br\s*\/?>/i)) {
        const plano = linea.replace(/<[^>]+>/g, "").trim();
        if (plano.startsWith(MARCA_PREGUNTA)) {
          const texto = plano.slice(MARCA_PREGUNTA.length).trim();
          if (texto) preguntas.push(texto);
        }
      }
      continue;
    }

    const plano = p.replace(/<[^>]+>/g, "").trim();
    if (!plano || esParrafoSoloDuracion(plano)) continue;
    parrafosIntro.push(p);
  }

  return {
    textoIntro: parrafosIntro.length > 0 ? parrafosIntro.map((p) => `<p>${p}</p>`).join("\n\n") : null,
    preguntas,
  };
}
