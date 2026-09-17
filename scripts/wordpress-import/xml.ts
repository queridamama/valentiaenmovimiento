// Extractor dirigido para el WXR (export de WordPress) — no un parser XML
// genérico: solo necesitamos leer, de cada <item>, un puñado de campos
// simples (título, id, estado, fecha, cuerpo). Un parser XML completo
// sería una dependencia nueva para resolver un problema mucho más chico.
export interface ItemWordPress {
  postId: string | null;
  postType: string | null;
  title: string | null;
  status: string | null;
  postDate: string | null;
  contentEncoded: string | null;
}

function extraerCampo(bloque: string, etiqueta: string): string | null {
  const conCdata = new RegExp(`<${etiqueta}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${etiqueta}>`);
  const plano = new RegExp(`<${etiqueta}>([\\s\\S]*?)</${etiqueta}>`);
  const m = bloque.match(conCdata) ?? bloque.match(plano);
  return m ? m[1] : null;
}

export function extraerItems(xml: string): ItemWordPress[] {
  const bloques = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return bloques.map((bloque) => ({
    postId: extraerCampo(bloque, "wp:post_id"),
    postType: extraerCampo(bloque, "wp:post_type"),
    title: extraerCampo(bloque, "title"),
    status: extraerCampo(bloque, "wp:status"),
    postDate: extraerCampo(bloque, "wp:post_date"),
    contentEncoded: extraerCampo(bloque, "content:encoded"),
  }));
}
