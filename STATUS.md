# Estado de construcción — Valentía en Movimiento

Actualizado en cada entrega.

## Auditoría de Fase 0–1 (esta ronda)

**No cerrada como "lista para producción" — ver el punto "Lo que falta
verificar" al final.** Esto es lo que se corrigió:

### 1. Stack actualizado
- Next.js `^16.3.5` (Active LTS), React `^19`. (Verificado por búsqueda
  web al momento de esta auditoría: 16.3.x es Active LTS, 15.5.x
  Maintenance LTS.)
- `@supabase/ssr` `^0.12.0`, con la API actual `getAll`/`setAll` (la
  versión anterior de este proyecto todavía usaba `get`/`set`/`remove`,
  que está deprecado).
- `cookies()` de Next.js ahora se usa `await`-eada (cambio de comportamiento
  entre Next 14 y 15+).
- Variables de entorno migradas a las claves nuevas de Supabase
  (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`) — Supabase
  va a discontinuar `anon`/`service_role` a fines de 2026 y los proyectos nuevos ya no
  las emiten.

### 2. RLS revisada y endurecida
- **`usuarios` se separó en `perfiles` (editable) y `autorizaciones`
  (nivel/rol)**. Ninguna usuaria tiene policy de insert/update sobre
  `autorizaciones` salvo un admin real (`es_admin()`) — ni siquiera un
  editor puede tocarla. El único otro camino de escritura es el trigger
  de alta y el service role (webhook de pagos).
- Contenido, cursos, módulos y eventos: la policy de `select` ahora valida
  `nivel_acceso` contra `autorizaciones.nivel` en la base (función
  `nivel_actual()`), no solo en la query del frontend.
- "Necesito destrabar": policy de `select`/`insert` en
  `publicaciones_comunidad`/`comentarios`/`reacciones` bloquea lectura y
  escritura si `nivel_actual() <> 'premium'` (salvo staff).
- "Meli": solo `es_staff()` puede insertar publicaciones en esa categoría;
  todas pueden leer y comentar.
- Proyecto pausado: las policies de `update` en `proyectos_valentia`,
  `progreso_etapas`, `hitos`, y de `all` en `movimientos_semanales`/
  `evidencias` (cuando tienen `proyecto_id`) exigen `estado = 'activo'` en
  el proyecto dueño. La lectura sigue permitida siempre.

### 3. Integridad de datos
- Índices únicos parciales: un solo `sueño` activo y un solo `proyecto de
  valentía` activo por usuaria.
- Triggers `validar_propiedad_proyecto` / `validar_propiedad_movimiento_o_evidencia`:
  impiden que un sueño, proyecto o movimiento de una usuaria quede
  referenciado desde una fila de otra usuaria (RLS sola no alcanza para
  esto porque compara contra una fila que la usuaria sí puede insertar
  con su propio `usuario_id`, apuntando a un `id` ajeno).

### 4. Funciones SECURITY DEFINER
- `manejar_usuario_nuevo`, `validar_propiedad_proyecto`,
  `validar_propiedad_movimiento_o_evidencia`, `es_staff`, `es_admin`,
  `nivel_actual`: todas con `set search_path = public, pg_temp` explícito.

### 5. Registro y confirmación de email
- `signUp` ahora distingue si Supabase devolvió sesión (`data.session`)
  o no, y redirige a `/registro/revisa-tu-email` en el segundo caso, en
  vez de mandar a `/inicio` y que rebote a `/login` sin explicación.
- Ruta `/auth/confirm` (patrón oficial de Supabase) procesa el link del
  mail (`token_hash` + `type`) y redirige a `/inicio`; `/auth/error` si
  el link ya no es válido.
- Login distingue "email sin confirmar" de "credenciales incorrectas".

### 6. Nombres de tabla en ASCII
`sueños`/`sueño_id` pasaron a `suenos`/`sueno_id`. No es un cambio de
producto — es para evitar problemas de encoding en URLs de PostgREST y en
clientes que no normalizan UTF-8 en querystrings. Lo marco explícitamente
porque toca nombres que ya habíamos definido juntos.

### 7. Tests de permisos
`supabase/tests/rls.test.ts`: script reproducible que corre los 7
escenarios pedidos (auto-ascenso de nivel, auto-ascenso de rol, lectura de
contenido premium siendo gratuita, lectura de "Necesito destrabar", acceso
a sueño/proyecto ajeno, edición de proyecto pausado, y la variante de
anónima) directo contra la API de Supabase, sin pasar por la UI.

## Auditoría de Fase 0–1 — Ronda 2 (correcciones puntuales)

**Sigue sin cerrarse "lista para producción"** — mismo motivo que antes
(sin red acá para instalar/buildear/correr contra Supabase real). Esta
ronda fue una revisión estática: corregí 5 puntos de autorización e
integridad que quedaron mal en la primera pasada.

1. **`proyectos_valentia` ahora exige premium de verdad.** `proyectos_insert`
   pedía solo `usuario_id = auth.uid()` — una gratuita podía crear un
   Proyecto llamando directo a la API. Ahora exige además
   `nivel_actual() = 'premium'`. Agregué `proyecto_editable()` (activo +
   premium) y la usé también en `progreso_etapas`, `hitos`,
   `movimientos_semanales` y `evidencias` para que la protección sea
   consistente en toda la cadena de escritura premium.
2. **Contenido por etapa: colapsé dos policies de `select` en una sola.**
   Había un error real: dos policies *permissive* de `select` sobre
   `contenidos` se combinan con OR en Postgres, así que la policy
   "etapa = solo premium" no anulaba a la primera, que ya dejaba pasar
   `contexto = 'etapa'` sin chequear nivel. Ahora hay una sola policy que
   usa `contenido_accesible()`, con la lógica completa en un solo lugar:
   etapa → siempre premium; módulo de curso → hereda del curso; biblioteca
   → nivel propio (columna nueva en `contenido_ubicaciones`); compra
   individual → no accesible todavía (no hay tabla de compras); **sin
   ninguna ubicación → ya NO se trata como gratis por default, queda
   inaccesible para miembros** (antes sí se colaba como gratis).
3. **Reacciones ahora respetan la categoría de la publicación.**
   `reacciones_insert` solo chequeaba `usuario_id = auth.uid()` — alguien
   podía reaccionar a una publicación de "Necesito destrabar" conociendo
   el UUID, sin ser premium. Alineé la policy con la misma condición que
   ya tenía `comentarios_insert`.
4. **Grabaciones de evento reutilizan el CMS.** `eventos.grabacion_url`
   (texto suelto) pasó a `eventos.contenido_grabacion_id`, referenciando
   una fila de `contenidos` (tipo `taller_grabado`). Esa fila se carga una
   sola vez y, además de quedar visible como grabación del evento, se
   puede ubicar también en una etapa/curso/biblioteca vía
   `contenido_ubicaciones` sin volver a subir el archivo.
5. **Tests nuevos** en `rls.test.ts` (ahora 12 escenarios en total):
   gratuita no puede crear un Proyecto; gratuita no lee contenido de
   etapa pero premium sí; contenido publicado sin ubicación no se vuelve
   público para nadie (ni gratis ni premium); un curso gratuito sí expone
   su contenido a gratuitas; gratuita no puede reaccionar a "Necesito
   destrabar".

Chequeo que sí pude hacer desde acá: pasé todos los archivos `.ts`/`.tsx`
por `tsc --noEmit` (sin `node_modules`, así que solo detecta errores de
sintaxis, no de tipos) y no salió ningún error real de sintaxis — todo lo
que reportó fue "no encuentro el módulo/tipo", esperable sin dependencias
instaladas. Sigue sin ser un build real.



Esta conversación no tiene acceso a internet: `npm install` devuelve
`403 Forbidden` contra el registro de npm. Por lo tanto:
- **No corrí `npm install`, `next build`, `next lint` ni el typecheck.**
  El código está escrito siguiendo la sintaxis y las APIs vigentes según
  la documentación que sí pude consultar (tengo acceso a búsqueda web),
  pero no está compilado ni probado end-to-end.
- **No corrí `supabase/tests/rls.test.ts`** contra un proyecto Supabase
  real — no tengo forma de crear uno ni de alcanzar la red desde acá.
- Hice sí un chequeo manual de sintaxis del SQL (balance de paréntesis y
  de bloques `$$…$$`) y confirmé a mano que no quedó ningún llamado a
  `crearClienteServidor()` sin `await`.

**No considero Fase 0/1 cerradas hasta que esto se corra de verdad.**
Pasos concretos para destrabarlo (ver mensaje de chat): mover el proyecto
a Claude Code, donde sí hay red y persistencia, para instalar, buildear,
correr los tests de permisos contra un Supabase real, y hacer commit.

## Fase 0 — Fundaciones
- [x] Estructura de proyecto, stack actualizado
- [x] Clientes Supabase + middleware con API `getAll`/`setAll` vigente
- [x] Esquema SQL endurecido (RLS, constraints, triggers, funciones seguras)
- [x] Script de verificación de permisos (sin correr — ver arriba)
- [ ] `npm install` + build + lint verificados (bloqueado: sin red acá)
- [ ] Tests de permisos corridos contra Supabase real (bloqueado: sin red acá)
- [ ] Proyecto Supabase real creado (acción tuya)
- [ ] Deploy en Vercel (acción tuya / Claude Code)

## Fase 1 — Identidad y Sueño
- [x] Registro y login, con manejo de confirmación de email
- [x] Trigger de alta (perfiles + autorizaciones)
- [x] Middleware que protege rutas
- [x] Mi Sueño / Inicio / Perfil sobre el esquema endurecido
- [ ] Validación end-to-end (bloqueado: mismo motivo)

## Fase 2 — Base de Administración / CMS propio
- [ ] Sin empezar — siguiente paso una vez verificadas Fase 0/1

## Fases 3–11
- [ ] Sin empezar
