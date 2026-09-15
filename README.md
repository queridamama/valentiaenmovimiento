# Valentía en Movimiento

"Tomate tus sueños en serio." Stack: Next.js + TypeScript + Tailwind + Supabase + Mercado Pago (todavía no) + Vercel.

## Puesta en marcha (proyecto Supabase nuevo)

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. En el SQL Editor de Supabase, ejecutar **en este orden**:
   1. `supabase/schema.sql` completo.
   2. `supabase/migrations/0002_experiencias.sql` completo (agrega
      experiencias/preguntas/respuestas administrables + contenido demo).
3. Copiar `.env.example` a `.env.local` y completar con los datos del
   proyecto Supabase: **Settings → API Keys → pestaña "API Keys"** (no
   "Legacy") para la URL, la publishable key y la secret key.
4. `npm install`
5. `npm run dev` → http://localhost:3000
6. `npm run test:rls` → corre la verificación de permisos de
   `supabase/tests/rls.test.ts` contra ese proyecto (ver
   `supabase/tests/README.md`)
7. `npm run build` y `npm run lint` antes de dar por cerrada cualquier fase

## Puesta en marcha (proyecto Supabase que YA tiene `schema.sql` corrido)

Si ya ejecutaste `supabase/schema.sql` en tu proyecto real, **no lo vuelvas
a correr**: solo hace falta `supabase/migrations/0002_experiencias.sql`
(es aditivo, no borra ni modifica nada existente). Después seguí desde el
paso 3 de arriba.

## Estado del proyecto

Ver `STATUS.md` para el avance fase por fase.

## Estructura

```
app/                        Rutas (App Router de Next.js)
  (app)/                    Rutas autenticadas con nav inferior:
    inicio/                 Home (distinta para Gratis/Premium)
    mi-sueno/               Mi Ruta: recorrido de entrada + etapas premium
    experiencias/[id]/      Corredor genérico de una experiencia (video/texto + preguntas)
    movimiento/             Ritual semanal (elegir movimiento, evidencia, compartir)
    mi-proyecto/            Documento vivo armado con las respuestas guardadas
    membresia/              Pantalla de Membresía (sin Mercado Pago todavía)
    comunidad/, perfil/
  admin/                    Panel de administración (solo admin/editor)
    experiencias/           CRUD de experiencias + preguntas
    usuarias/               Cambiar nivel (Gratis/Premium) y rol — solo admin
  login/, registro/, recuperar/, actualizar-contrasena/   Auth
lib/
  supabase/                 Clientes de Supabase (browser y servidor)
  acciones/                 Server actions (mutaciones de datos)
  datos.ts                  Queries de lectura compartidas entre páginas
  tipos.ts                  Áreas de "Mi Proyecto" y tipos compartidos
middleware.ts               Protección de rutas + refresco de sesión
supabase/schema.sql         Esquema original (NO tocar/reemplazar)
supabase/migrations/        Migraciones aditivas posteriores
design-reference/           Diseño de Claude Design (fuente visual)
```

## Cómo se administra el contenido

Las "experiencias" (las clases de Mi Sueño y de cada etapa del método) se
crean y editan desde `/admin/experiencias`, sin tocar código: título,
texto, video opcional, preguntas y su orden, etapa, acceso (Gratis/Premium)
y estado (borrador/publicado/archivado). Si una experiencia no tiene video
todavía, funciona igual con texto + preguntas.

Cada pregunta se etiqueta con un "área" (sueño, para qué, identidad,
etc.) — es lo que hace que la respuesta aparezca sola en la sección
correspondiente de Mi Proyecto, sin escribir código nuevo por cada
experiencia futura.
