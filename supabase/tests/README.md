# Verificación de permisos (RLS)

`rls.test.ts` corre los escenarios de ataque concretos pedidos en las dos
rondas de auditoría (auto-ascenso de nivel/rol, lectura de contenido
premium siendo gratuita, lectura de "Necesito destrabar", acceso a datos
de otra usuaria, edición de un Proyecto pausado, creación de un Proyecto
siendo gratuita, lectura de contenido de etapa, contenido publicado sin
ubicación, contenido de curso gratuito, reacciones a "Necesito destrabar")
directo contra la API de Supabase — sin pasar por la UI de la app.

## Cómo correrlo

1. Crear un proyecto Supabase (puede ser uno de pruebas, no el de
   producción) y correr `supabase/schema.sql` completo en él.
2. Completar `.env.local` con las 3 variables que pide el script (ver
   `.env.example`): URL, publishable key y **secret key** (esta última
   solo se usa para crear/limpiar las usuarias de prueba — nunca para los
   intentos que se están testeando, eso siempre pasa por la publishable
   key, como pasaría con cualquier usuaria real).
3. `npm run test:rls`

El script crea 4 usuarias de prueba (gratis, premium, editor, admin), corre
12 escenarios, imprime ✅/❌ por cada uno, y borra las usuarias de prueba
al final.

## Por qué no se corrió todavía

Esta conversación no tiene acceso a internet ni a un proyecto Supabase
real, así que no pude ejecutarlo — el script está escrito y listo, pero
sin verificar contra una base real. Es el primer paso a correr en cuanto
tengas un proyecto Supabase de pruebas conectado (ver STATUS.md).
