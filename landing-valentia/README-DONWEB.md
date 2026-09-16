# Cómo publicar la landing en DonWeb

Esta guía no da vuelta con explicaciones técnicas. Son los pasos, en orden.

La página va a quedar en: **https://melisadiaz.com.ar/valentia/**

---

## 1. Generar la versión final (una sola vez por cambio)

Necesitás tener [Node.js](https://nodejs.org) instalado en tu computadora (versión 22 o más nueva). Se instala una sola vez, como cualquier programa.

Abrí una terminal dentro de la carpeta `landing-valentia/` y ejecutá, en este orden:

```
npm install
npm run build
```

- `npm install` descarga lo necesario para poder generar la página. Se hace **una sola vez** (o cuando alguien cambie algo en el proyecto, no en el contenido).
- `npm run build` genera la versión final, lista para subir.

Cuando termina, vas a tener una carpeta nueva llamada **`dist`** dentro de `landing-valentia/`. Esa carpeta es literalmente la página web entera, ya armada.

---

## 2. Qué carpeta subir

Subís el **contenido** de la carpeta `dist` — es decir, todos los archivos y carpetas que están *adentro* de `dist` (el archivo `index.html`, la carpeta `images`, `favicon.svg`, etc.).

**No subas la carpeta `dist` en sí misma con ese nombre.** Se sube lo de adentro.

---

## 3. Dónde subirla en DonWeb

1. Entrá al panel de tu hosting de DonWeb (cPanel o el Administrador de Archivos que uses).
2. Andá a la carpeta pública de tu sitio — normalmente se llama **`public_html`**.
3. Dentro de `public_html`, creá una carpeta llamada **`valentia`** (si todavía no existe).
4. Entrá a esa carpeta `public_html/valentia/` y subí ahí todo el contenido de `dist` (del paso 2).

Podés subir los archivos por FTP (con un programa como FileZilla) o directamente desde el Administrador de Archivos de DonWeb, comprimiendo `dist` en un `.zip`, subiendo ese `.zip` a `public_html/valentia/` y usando la opción "Extraer" del Administrador de Archivos.

**Importante:** esto solo toca la carpeta `valentia`. No afecta nada que ya tengas en `melisadiaz.com.ar` (ni WordPress, ni ninguna otra cosa en la raíz del sitio).

---

## 4. Qué URL abrir después

Una vez subido, abrí en el navegador:

**https://melisadiaz.com.ar/valentia/**

(con la barra `/` al final). Ahí tiene que verse la landing completa, con el botón "Empezar gratis" funcionando y llevando a la aplicación real.

---

## 5. Cómo reemplazar la versión en el futuro

Cada vez que se cambie algo (un texto, una foto, un link):

1. Se hace el cambio en el proyecto (podés pedirle a tu asistente que lo haga).
2. Se corre de nuevo: `npm run build`.
3. Se sube de nuevo el contenido de la carpeta `dist` a `public_html/valentia/` en DonWeb, **reemplazando** los archivos que ya estaban ahí (decir "sí" cuando pregunte si querés sobrescribir).
4. Se abre `https://melisadiaz.com.ar/valentia/` para confirmar que se actualizó. Si el navegador muestra la versión vieja, probá recargar la página forzando el refresco (Ctrl+Shift+R en Windows, Cmd+Shift+R en Mac).

No hace falta reiniciar nada ni avisarle a nadie: es un sitio de archivos estáticos, como una carpeta de fotos.

---

## Dónde reemplazar el contenido de marketing (fotos y textos)

Todo el texto de la página vive en **un solo archivo**:

```
src/content/valentia.ts
```

Para cambiar cualquier frase de la web, se edita ese archivo (o se le pide a tu asistente "cambiá esta frase por esta otra") — no hace falta tocar nada más. Hay una guía más detallada, con un mapa de qué bloque de ese archivo corresponde a cada sección de la página (Hero, Gratis, Premium, Sobre Meli, FAQ, Cierre, etc.), en **`EDITAR-TEXTOS.md`**.

Las imágenes van en `public/images/`. Hoy son composiciones de marca temporales (dicen "REEMPLAZAR" bien visible) para que la página no se vea vacía mientras no están las fotos/el logo definitivos. Reemplazalas por archivo, respetando el mismo nombre:

| Qué es | Dónde va | Nombre de archivo |
|---|---|---|
| **Logo real de Valentía en Movimiento** | `public/images/valentia/logo.svg` | `logo.svg` |
| Foto real de Meli | `public/images/meli.webp` | `meli.webp` |
| Segunda foto (chica, opcional) de Meli, superpuesta a la principal | `public/images/valentia/meli-detalle.jpg` | `meli-detalle.jpg` |
| Foto/imagen del hero (portada de arriba de todo) | `public/images/valentia/hero.jpg` | `hero.jpg` |
| Segunda foto (chica, opcional) del hero, superpuesta a la principal | `public/images/valentia/hero-detalle.jpg` | `hero-detalle.jpg` |
| Imagen que se comparte en WhatsApp/redes (OpenGraph) | `public/images/valentia/og-cover.jpg` | `og-cover.jpg` |
| Captura de Inicio de tu espacio en Valentía | `public/images/app/home.webp` | `home.webp` |
| Captura de Mi Sueño | `public/images/app/mi-sueno.webp` | `mi-sueno.webp` |
| Captura de Movimiento semanal | `public/images/app/movimiento.webp` | `movimiento.webp` |
| Captura de Comunidad | `public/images/app/comunidad.webp` | `comunidad.webp` |
| Captura de Evidencia | `public/images/app/evidencia.webp` | `evidencia.webp` |

Para reemplazar una imagen (o el logo): borrás el archivo viejo, subís el nuevo con **exactamente el mismo nombre**, corrés `npm run build` de nuevo y volvés a subir `dist` (pasos 1 a 3 de arriba).

**Sobre el logo:** hoy `logo.svg` es un placeholder que imita los colores y la composición de la marca, con la etiqueta "REEMPLAZAR" bien visible — no es el logo real. En cuanto tengas el archivo definitivo (idealmente SVG con fondo transparente; si solo tenés PNG también sirve, avisale a tu asistente para que cambie una línea), lo subís pisando ese mismo archivo y el logo real va a aparecer solo en el header y en el pie de página, sin tocar ningún otro archivo del proyecto.

---

## Si el día de mañana la app cambia de dirección

Hoy los botones "Empezar gratis" y "Ya soy parte · Entrar" llevan a `valentiaenmovimiento.vercel.app`. Si en el futuro la app se muda (por ejemplo a `app.melisadiaz.com.ar`), **no hay que buscar y cambiar el link en toda la página**: se cambia una sola línea en:

```
src/config/site.ts
```

(la línea que dice `export const APP_URL = "..."`) y se vuelve a generar (`npm run build`) y subir.
