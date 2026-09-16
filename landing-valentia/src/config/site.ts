// Configuración central de la app a la que esta landing deriva.
// Cuando la app se mude a https://app.melisadiaz.com.ar, el cambio es
// UNA línea acá — nada de buscar "vercel.app" por todo el proyecto.
export const APP_URL = "https://valentiaenmovimiento.vercel.app";

export const REGISTER_URL = `${APP_URL}/registro`;
export const LOGIN_URL = `${APP_URL}/login`;

// Dominio + subcarpeta finales de publicación (usado para OpenGraph,
// canonical y sitemap — ver también `site`/`base` en astro.config.mjs,
// que tienen que coincidir con esto).
export const SITE_URL = "https://melisadiaz.com.ar";
export const SITE_BASE = "/valentia/";
export const CANONICAL_URL = `${SITE_URL}${SITE_BASE}`;

// Resuelve un path de /public respetando el subdirectorio de despliegue
// (import.meta.env.BASE_URL ya incluye el `base` de astro.config.mjs).
// Usar SIEMPRE esto para imágenes en vez de rutas absolutas tipo
// "/images/...", porque una ruta absoluta a secas se rompe en cuanto el
// sitio no vive en la raíz del dominio.
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const relativo = path.replace(/^\//, "");
  return `${base}${relativo}`;
}
