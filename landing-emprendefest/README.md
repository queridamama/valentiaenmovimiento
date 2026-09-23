# Emprendefest Córdoba rumbo a Buenos Aires — landing

Landing estática de una sola página: HTML, CSS y JS, sin dependencias ni
paso de compilación. Todas las rutas son relativas, así que funciona abriendo
`index.html` directo en el navegador o desde cualquier carpeta del hosting.

## Contenido

```
index.html                         la página
styles.css                         estilos (mobile-first)
fonts-local.css                    opcional: fuentes alojadas en el hosting
main.js                            links, menú mobile, CTA fija en mobile
README.md                          este archivo
assets/
  logo-emprendefest.webp           logo oficial usado en la página
  logo-emprendefest.png            mismo logo en PNG (respaldo y favicon)
  logo-emprendefest-original.png   archivo original recibido, sin modificar
  fonts/                           vacía salvo LEEME.txt (ver "Tipografías")
```

`logo-emprendefest.webp/.png` son el logo original con el margen
transparente recortado y reducido a 900 px de ancho. El diseño no se tocó.

## Subir al hosting de Raíces

1. En el administrador de archivos, crear `/public_html/emprendefest/`.
2. Subir `landing-emprendefest.zip` **dentro** de esa carpeta y descomprimirlo
   ahí: `index.html` tiene que quedar en `/public_html/emprendefest/index.html`
   (no en una subcarpeta).
3. Borrar el .zip del servidor.
4. Abrir `https://<dominio>/emprendefest/`.

No hace falta PHP, base de datos ni configuración del servidor.

## Links (checkout, formulario, WhatsApp)

Al principio de `main.js`:

```js
const LINKS = {
  GENERAL_CHECKOUT_URL: "",
  VIP_CHECKOUT_URL: "",
  EMBAJADORA_FORM_URL: "",
  WHATSAPP_URL: "",
};
```

Pegar cada URL completa (con `https://`) entre las comillas. Mientras un link
esté vacío, el botón muestra el aviso "disponible muy pronto" en vez de navegar.

| Link | Botones |
| --- | --- |
| `GENERAL_CHECKOUT_URL` | "Quiero esta entrada" de la card General |
| `VIP_CHECKOUT_URL` | "Quiero esta entrada" de la card VIP |
| `EMBAJADORA_FORM_URL` | "Quiero ser embajadora" de la sección Embajadoras y del cierre |
| `WHATSAPP_URL` | "Tengo una duda" del cierre |

Los "Quiero mi entrada" (navbar, hero, cierre, barra mobile) bajan a la
sección *Elegí tu entrada*; el "Quiero ser embajadora" del hero baja a la
sección *Embajadoras*.

## Textos pendientes

Buscar `[PENDIENTE]` y `data-editable` en `index.html`:

- Beneficios oficiales de la VIP (`data-editable="vip-beneficios"`).
- Precio VIP Embajadora (`data-editable="vip-embajadora-precio"`).
- FAQ: entrega de la entrada oficial, cuotas, entrega de Córdoba 2027,
  paso a paso de Embajadoras, precio VIP Embajadora, fechas de encuentros.

## Tipografías

Títulos en **Clash Display** (la del material oficial) y textos en
**General Sans**, ambas de Fontshare, gratuitas para uso comercial.

**Opción A — como viene (recomendada para empezar):** se cargan desde
Fontshare (`api.fontshare.com`), un servicio público. No hay que hacer nada.
Si por algún motivo no cargan, la página se ve igual con la tipografía del
sistema.

**Opción B — alojarlas en el hosting:**

1. Descargar Clash Display y General Sans desde
   https://www.fontshare.com/fonts/clash-display y
   https://www.fontshare.com/fonts/general-sans.
2. De la carpeta `Fonts/WEB/fonts/` de cada descarga, copiar a
   `assets/fonts/`: `ClashDisplay-Semibold.woff2`, `ClashDisplay-Bold.woff2`,
   `GeneralSans-Regular.woff2`, `GeneralSans-Medium.woff2`,
   `GeneralSans-Semibold.woff2`.
3. En `index.html`, reemplazar las dos líneas `<link ... fontshare ...>` por
   `<link rel="stylesheet" href="fonts-local.css" />`.

## Compartir en redes

Para que WhatsApp/Instagram muestren la imagen al compartir el link, cambiar
en `index.html` el `og:image` por la URL completa, por ejemplo
`https://<dominio>/emprendefest/assets/logo-emprendefest.png`.
