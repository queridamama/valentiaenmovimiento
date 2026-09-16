# Cómo editar los textos de la landing

Todo el texto que se ve en la página vive en **un solo archivo**:

```
src/content/valentia.ts
```

No hay que buscar frases dentro de las secciones (Hero, Premium, etc.) ni tocar ningún otro archivo. Cada bloque de ese archivo es un pedazo de la web, con un nombre en español que dice qué sección es. Para cambiar una frase: se busca el bloque, se cambia el texto entre comillas, se guarda, y se corre `npm run build` de nuevo (ver `README-DONWEB.md` para subir la versión actualizada).

También podés simplemente pedirle a tu asistente: *"cambiá esta frase por esta otra en el Hero"* — con este archivo como mapa, sabe exactamente dónde ir.

---

## Mapa de bloques → secciones de la página

| Bloque en el archivo | Qué sección de la web es |
|---|---|
| `marca` | Nombre de la marca y frases cortas que se repiten (usadas en el título de la pestaña del navegador, etc.) |
| `nav` | El menú de arriba de todo (Header): los links "Qué es", "Cómo funciona", etc., y los botones "Ya soy parte" / "Empezar gratis" |
| `hero` | Lo primero que se ve al entrar a la página: el título grande, el texto de abajo y los botones |
| `algunDia` | La sección oscura de "Algún día también puede durar años" |
| `tesis` | "Los sueños se construyen": el título, el texto, el cierre y la fórmula (Intención + Valentía + Estrategia + Acción) |
| `estrategia` | "Los sueños también necesitan estrategia": la mirada personal de Meli sobre construir con estrategia sin perder la conexión con una misma |
| `recorrido` | "Empezás por un sueño": la introducción y los 5 pasos numerados (Elegís tu sueño, Encontrás tu para qué, etc.) |
| `appShowcase` | "Tu espacio dentro de Valentía": el texto arriba de las capturas de pantalla |
| `semana` | "Una semana en movimiento": lunes / durante la semana / viernes, y las dos frases de cierre |
| `gratisNoEsDemo` | La sección **Valentía Gratis** (el recuadro verde lima con la lista de lo que incluye) |
| `evidencia` | La sección oscura "Mirá todo eso que antes no existía" con la lista de ejemplos |
| `premium` | La sección **Premium** completa: título, las 5 etapas, los dos recuadros ("Cosas que probablemente ya no te sirven" / "Lo que vamos a trabajar") y la comparación Gratis vs Premium |
| `meli` | **Sobre Meli**: su presentación en primera persona y la frase final |
| `paraQuienEs` | "Esto puede ser para vos si..." |
| `faq` | Preguntas frecuentes |
| `cierre` | El cierre final de la página, con el último botón "Empezar gratis" |
| `seo` | El título y la descripción que aparecen en Google y al compartir el link (no se ve en la página en sí) |

---

## Qué NO hacer acá

- No se agrega HTML ni símbolos raros dentro de las frases — solo texto normal, tal como se quiere que aparezca escrito.
- Si una frase tiene comillas dentro (como `“algún día”`), hay que dejar esas comillas tal cual están, sin borrarlas.
- No se cambia el nombre de los bloques (`hero`, `premium`, etc.) ni la estructura de llaves `{ }` y corchetes `[ ]` — solo el texto que está entre comillas.
- Esto **no es un CMS**: no hay un panel visual para editar. Es un archivo de texto simple. Si en el futuro se quiere un panel tipo WordPress/Elementor para editar sin tocar código, es un proyecto aparte — no está construido todavía.

---

## Dónde van las fotos y el logo

Eso no está en este archivo. Ver la sección "Dónde reemplazar el contenido de marketing" en `README-DONWEB.md`, que tiene la tabla completa de imágenes y el archivo del logo.
