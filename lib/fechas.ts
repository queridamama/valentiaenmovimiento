export function diasDesde(fechaIso: string): number {
  const ms = Date.now() - new Date(fechaIso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function diaDelProyecto(fechaInicioIso: string): number {
  return diasDesde(fechaInicioIso) + 1;
}

// "hace 2 horas" / "hace 3 días" — para timestamps reales (fecha_creado),
// nunca para datos que no existen.
export function tiempoRelativo(fechaIso: string): string {
  const ms = Date.now() - new Date(fechaIso).getTime();
  const minutos = Math.floor(ms / (1000 * 60));
  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} hora${horas === 1 ? "" : "s"}`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `hace ${dias} día${dias === 1 ? "" : "s"}`;
  const meses = Math.floor(dias / 30);
  return `hace ${meses} mes${meses === 1 ? "" : "es"}`;
}
