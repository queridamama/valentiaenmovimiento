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
un modal corto con el instructivo pedido:

1. Abrí esta página en Safari.
2. Tocá el botón Compartir.
3. Elegí "Agregar a pantalla de inicio".

Si la PWA ya está instalada y se abre en standalone, no se muestra nada.

## Qué falta: el ícono cuadrado

`public/` hoy solo tiene `logo.svg`, que es horizontal (el isotipo +
nombre). Por pedido explícito, **no inventé una versión cuadrada
reinterpretando el logo** — el manifest ya está preparado con los paths
finales (`app/manifest.ts`), pero mientras esos archivos no existan,
Chrome no puede resolver los íconos y **no va a disparar
`beforeinstallprompt`** (es parte de sus criterios de instalabilidad) —
o sea, en Android el bloque de instalación no va a tener nada para
mostrar hasta que esto se resuelva. En iOS el instructivo funciona igual
sin esto, pero el ícono que iOS pone en la pantalla de inicio también
sale mal sin un `apple-touch-icon` real.

**Lo que necesito, en un solo archivo:** un ícono cuadrado (sin el
nombre "Valentía en Movimiento" al lado, solo el isotipo/marca), en PNG
o SVG, de al menos 512×512px (ideal 1024×1024), con el elemento
principal centrado y con aire alrededor (dejar ~15% de margen libre por
lado, para que no se corte si el sistema operativo le aplica una máscara
circular o redondeada).

Con ese único archivo genero yo mismo, sin reinterpretar nada — es
puro redimensionado técnico —, los 4 tamaños que hacen falta:

- `public/icons/icon-192.png` (192×192)
- `public/icons/icon-512.png` (512×512)
- `public/icons/icon-maskable-512.png` (512×512, mismo margen de
  seguridad de arriba)
- `public/icons/apple-touch-icon.png` (180×180, fondo sólido, sin
  transparencia — así lo pide iOS)

Y termino de conectar `metadata.icons.apple` en `app/layout.tsx` (falta
ese archivo para agregarlo).
