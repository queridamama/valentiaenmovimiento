// Parser de CSV mínimo (RFC 4180): a mano, sin dependencia nueva, porque
// el export de WordPress tiene campos con saltos de línea embebidos
// (el contenido completo de cada meditación) y comillas escapadas ("")
// — un simple split por línea rompe esos casos.
export function parsearCsv(texto: string): string[][] {
  // Quitar un BOM UTF-8 inicial si existe (Excel/WordPress lo agregan).
  const limpio = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let entreComillas = false;

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];

    if (entreComillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      entreComillas = true;
    } else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\r") {
      // se ignora — normaliza CRLF, el \n de abajo cierra la fila
    } else if (c === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas.filter((f) => !(f.length === 1 && f[0] === ""));
}

// Filas como objetos {columna: valor}, usando la primera fila como header
// — más robusto que índices fijos si el export reordena columnas.
export function csvAObjetos(texto: string): Record<string, string>[] {
  const filas = parsearCsv(texto);
  if (filas.length === 0) return [];
  const header = filas[0];
  return filas.slice(1).map((fila) => {
    const obj: Record<string, string> = {};
    header.forEach((col, i) => {
      obj[col] = fila[i] ?? "";
    });
    return obj;
  });
}
