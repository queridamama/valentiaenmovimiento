# Emprendefest Córdoba rumbo a Buenos Aires — landing

Landing estática de una sola página (HTML/CSS/JS, sin dependencias ni build).
Para verla: abrir `index.html` en el navegador, o subir la carpeta completa a
cualquier hosting estático (DonWeb, Netlify, Vercel, GitHub Pages…).

```
index.html   contenido
styles.css   estilos (mobile-first)
main.js      links, menú mobile, CTA fija en mobile
assets/      logo oficial Emprendefest (sin modificar, solo recortado el margen transparente)
```

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

Pegar cada URL entre las comillas. Mientras un link esté vacío, el botón
muestra el aviso "disponible muy pronto" en vez de navegar.

Qué botón usa cada link:

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

Clash Display (títulos) y General Sans (textos) desde Fontshare, gratuitas
para uso comercial. Si no cargan, se usa la tipografía del sistema.
