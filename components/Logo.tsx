// Logo REAL de Valentía en Movimiento (no una reinterpretación). Carga
// siempre el mismo archivo: para reemplazarlo, subí el archivo definitivo
// pisando public/logo.svg con exactamente ese nombre — no hace falta tocar
// este componente ni ningún otro. Si el archivo real es PNG, cambiá
// únicamente el `src` de acá abajo.
export default function Logo({ tamano = "chico", className = "" }: { tamano?: "chico" | "grande"; className?: string }) {
  const alturas = tamano === "grande" ? "h-11" : "h-7";
  // eslint-disable-next-line @next/next/no-img-element -- SVG estático de /public, no necesita optimización de next/image
  return <img src="/logo.svg" alt="Valentía en Movimiento" className={`w-auto ${alturas} ${className}`} />;
}
