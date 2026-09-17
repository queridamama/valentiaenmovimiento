# Valentía como PWA instalable — estado actual

## Qué existe hoy

- **Manifest** (`app/manifest.ts`, Next lo sirve en `/manifest.webmanifest`
  e inyecta el `<link rel="manifest">` solo): `name`, `short_name`,
  `start_url: "/inicio"`, `display: "standalone"`, `theme_color: "#255D78"`
  (color de marca), `background_color: "#F7F6F4"` (el mismo fondo de la
  app, `fondo` en `tailwind.config.ts`).
- **Service worker mínimo** (`public/sw.js`): solo `install`/`activate`.
  A propósito no cachea nada ni intercepta `fetch` — la app depende de
  Supabase Auth (cookies) y de datos que cambian todo el tiempo, y un
  service worker con caché mal pensada es la forma más común de terminar
  sirviendo una sesión vieja. Se registra desde
  `components/pwa/RegistrarServiceWorker.tsx`, montado en
  `app/layout.tsx` — no toca la lógica de auth ni el middleware.
- **`viewport.themeColor`** y **`metadata.appleWebApp`** en
  `app/layout.tsx` (barra de estado de iOS, título corto al agregarla).
- **Bloque de instalación** en `/inicio`
  (`components/pwa/InstalarPWA.tsx`), después de los 4 accesos
  principales — discreto, no protagonista.

No se tocó el middleware de auth, ni Mi Ruta, Biblioteca, Comunidad,
Movimiento, Premium, landing ni ningún texto ya aprobado.

## Cómo funciona en Android / Chrome

1. Chrome evalúa el manifest y, si cumple los criterios de
   instalabilidad, dispara el evento `beforeinstallprompt`.
2. `InstalarPWA` escucha ese evento, lo guarda (`preventDefault()` +
   `setState`) y recién ahí muestra el bloque "Llevá Valentía con vos".
3. Al tocar "Agregar Valentía a mi inicio", se llama al `prompt()` nativo
   guardado — es el diálogo real del navegador, no uno inventado.
4. Si el navegador nunca dispara `beforeinstallprompt` (ya está instalada,
   o no cumple los criterios — ver "Qué falta" abajo), el bloque no se
   muestra.
5. Si la sesión ya corre en modo standalone (`display-mode: standalone`),
   el componente no renderiza nada.
6. Al instalarse (evento `appinstalled`) el bloque desaparece solo, sin
   recargar la página.

## Cómo funciona en iPhone / Safari

iOS no dispara `beforeinstallprompt` — no existe ahí. `InstalarPWA`
detecta iPhone/iPad (incluyendo iPadOS 13+, que se identifica como "Mac"
en el user agent salvo por tener `maxTouchPoints > 1`) y, si NO está en
modo standalone (`navigator.standalone === true`), muestra el mismo
bloque. Al tocarlo, en vez de un prompt nativo (no existe en iOS) se abre
un modal corto y simple, sin mencionar navegador (tanto Safari como
Chrome en iOS permiten agregar desde Compartir):

**"Agregá Valentía a tu pantalla de inicio"**
**"Tocá el botón Compartir ↑ y elegí 'Agregar a la pantalla principal'."**

Si la PWA ya está instalada y se abre en standalone, no se muestra nada.

## El ícono cuadrado

Resuelto: `public/iso.png` (1254×1254, sin transparencia, esquinas
rectas — el isotipo real que se subió al repo) es el ícono cuadrado
fuente. A partir de ahí se generaron con `sharp` (script corrido una
sola vez, no queda en el repo) los 4 archivos que usa `app/manifest.ts`
y `app/layout.tsx`:

- `public/icons/icon-192.png` (192×192) — resize directo.
- `public/icons/icon-512.png` (512×512) — resize directo.
- `public/icons/icon-maskable-512.png` (512×512) — el contenido se
  redujo a 410×410 (~80% del lienzo) y se centró sobre un fondo del
  mismo color exacto del original (`#fdf9f4`), para que la "zona
  segura" de un ícono maskable quede garantizada incluso si el sistema
  operativo aplica una máscara circular agresiva — el resize directo
  del isotipo original ya tenía aire, pero no tanto como para confiar
  en él sin ese margen extra.
- `public/icons/apple-touch-icon.png` (180×180) — resize directo, fondo
  sólido (sin transparencia, como pide iOS).

`metadata.icons` en `app/layout.tsx` ya apunta a `icon-512.png` y
`apple-touch-icon.png`.
