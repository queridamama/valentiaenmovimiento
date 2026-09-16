# Valentía en Movimiento — Landing pública

Landing 100% estática (Astro), pensada para publicarse en un hosting
tradicional dentro de un subdirectorio: **https://melisadiaz.com.ar/valentia/**

No requiere Node.js en producción, ni base de datos, ni servidor: el
`npm run build` genera HTML/CSS/JS estático en `dist/`, listo para subir
por FTP.

Es un proyecto **completamente independiente** de la aplicación
(`valentiaenmovimiento.vercel.app`) — no comparte dependencias, base de
datos ni configuración con ella. Solo la enlaza.

## Para publicar en DonWeb

Ver **[README-DONWEB.md](./README-DONWEB.md)** — instrucciones paso a paso
pensadas para alguien no técnico.

## Desarrollo local

```
npm install
npm run dev       # http://localhost:4321/valentia/
npm run build     # genera dist/
npm run preview   # sirve dist/ localmente para probarlo antes de subir
```

## Estructura

```
src/
  config/site.ts        URLs de la app (registro/login) y helper de rutas
                         con el subdirectorio — cambiar la app de dominio
                         es una línea acá, no una búsqueda global.
  content/valentia.ts    TODO el texto de la landing, centralizado.
  layouts/Base.astro     <head>, SEO/OpenGraph, fuente, header/footer.
  components/            Una sección de la landing por archivo.
  pages/index.astro      Arma la página completa con las secciones.
  styles/global.css      Paleta de marca (Tailwind v4, tokens en @theme).
public/
  images/                Fotos y capturas de la app (placeholders
                          reemplazables — ver README-DONWEB.md).
  favicon.svg, robots.txt
scripts/
  generar-placeholders.py  Regenera las imágenes placeholder si hace
                            falta (no se usa en el build normal).
```

## Analítica

No hay ningún pixel ni script de analítica cargado todavía (a propósito:
no se inventan IDs). El lugar para agregar Meta Pixel / GA4 / GTM está
comentado en `src/layouts/Base.astro`. Los CTAs principales ya tienen
`data-analytics="..."` para poder medir clicks apenas se agregue un
pixel real, sin tocar el resto del código.
