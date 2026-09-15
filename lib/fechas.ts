export function diasDesde(fechaIso: string): number {
  const ms = Date.now() - new Date(fechaIso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function diaDelProyecto(fechaInicioIso: string): number {
  return diasDesde(fechaInicioIso) + 1;
}
