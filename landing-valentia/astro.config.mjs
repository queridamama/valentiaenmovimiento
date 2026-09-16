import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

// Sitio 100% estático (sin adapter de servidor) pensado para vivir en un
// subdirectorio de un hosting tradicional (DonWeb), no en la raíz del
// dominio. `base` es lo que hace que TODOS los links y assets internos que
// Astro genera (incluido el sitemap) salgan con el prefijo /valentia — sin
// esto, el sitio se rompería apenas se lo suba a
// melisadiaz.com.ar/valentia/ en vez de la raíz.
export default defineConfig({
  site: "https://melisadiaz.com.ar",
  base: "/valentia",
  trailingSlash: "always",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [sitemap()],
});
