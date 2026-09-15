# Valentía en Movimiento

"Tomate tus sueños en serio." Stack: Next.js + TypeScript + Tailwind + Supabase + Mercado Pago + Vercel.

## Puesta en marcha

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. En el SQL Editor de Supabase, ejecutar `supabase/schema.sql` completo.
3. Copiar `.env.example` a `.env.local` y completar con los datos del
   proyecto Supabase: **Settings → API Keys → pestaña "API Keys"** (no
   "Legacy") para la URL, la publishable key y la secret key.
4. `npm install`
5. `npm run dev` → http://localhost:3000
6. `npm run test:rls` → corre la verificación de permisos de
   `supabase/tests/rls.test.ts` contra ese proyecto (ver
   `supabase/tests/README.md`)
7. `npm run build` y `npm run lint` antes de dar por cerrada cualquier fase

## Estado del proyecto

Ver `STATUS.md` para el avance fase por fase — incluye la auditoría de
seguridad de Fase 0/1 y qué quedó pendiente de verificar.

## Estructura

```
app/                  Rutas (App Router de Next.js)
  (app)/              Rutas autenticadas: inicio, mi-sueno, comunidad, perfil
  login/, registro/   Auth
lib/
  supabase/           Clientes de Supabase (browser y servidor)
  acciones/           Server actions (mutaciones de datos)
middleware.ts         Protección de rutas + refresco de sesión
supabase/schema.sql   Esquema completo de base de datos + RLS
```
