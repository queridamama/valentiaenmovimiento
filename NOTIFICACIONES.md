# Recordatorios del ritual semanal — estado actual y qué falta

## Qué existe hoy (implementado en esta pasada)

Recordatorios **dentro de la app**, en `/inicio`, calculados en el
servidor según el día de la semana y el estado real de tu movimiento:

- **Lunes**, si todavía no elegiste movimiento esta semana (o el anterior
  ya quedó cumplido): "Hoy es lunes: ¿qué movimiento vas a elegir esta
  semana?"
- **Viernes**, si tenés un movimiento elegido y todavía no registraste
  qué pasó: "Hoy es viernes: ¿qué pasó con tu movimiento esta semana?"

Se ven solo cuando son relevantes (no se acumulan, no hay que
descartarlos) y desaparecen solos apenas elegís el movimiento o
registrás qué pasó. Están en `app/(app)/inicio/page.tsx`.

**Importante:** el día de la semana se calcula con la hora del
servidor. Si el servidor no corre en horario de Argentina, puede haber
un desfasaje de unas horas cerca de la medianoche — no afecta la lógica
del ritual (elegir → volver → registrar), solo en qué momento exacto
aparece el cartel.

## Qué NO existe todavía: push notifications reales

Hoy la app **no tiene ninguna infraestructura de push notifications**.
Revisé el proyecto antes de esta pasada y confirmé que no existe:

- manifest.json / configuración de PWA instalable,
- service worker,
- suscripción de push (`PushManager`, VAPID keys),
- ninguna tabla en Supabase para guardar suscripciones de notificación,
- ningún cron/scheduler que dispare avisos los lunes/viernes.

No se simuló nada de esto. Los recordatorios de arriba son **solo
dentro de la app** — si la usuaria no abre Valentía ese día, no se
entera.

## Qué haría falta para push notifications reales

En términos generales (para cuando se priorice):

1. **Convertir la app en PWA instalable**: `manifest.json` + ícono +
   un service worker (Next.js tiene soporte, pero es una pieza nueva).
2. **Pedir permiso explícito** a la usuaria (nunca activarlo solo) — un
   botón tipo "Quiero recibir recordatorios" en Perfil.
3. **Guardar la suscripción push** (`PushSubscription`) en una tabla
   nueva de Supabase, asociada a `usuario_id`, con su propia RLS (cada
   una solo ve/borra la suya).
4. **Un disparador programado** (cron de Supabase, un cron job externo,
   o una Edge Function con schedule) que corra los lunes y viernes,
   recorra usuarias con movimiento pendiente/sin registrar, y envíe el
   push (librería tipo `web-push` + VAPID keys propias).
5. Manejar expiración/revocación de suscripciones (un push puede fallar
   si la usuaria desinstaló o cambió de navegador).

Es un trabajo real, no una casilla para tildar en una tarde — por eso
no se frenó esta entrega por esto, tal como se pidió. Los recordatorios
dentro de la app ya funcionan y son reales; el push queda documentado
acá para cuando se decida invertir en construirlo.
