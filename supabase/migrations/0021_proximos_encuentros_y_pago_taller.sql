-- Próximos encuentros + soporte idempotente para pagos puntuales.

create unique index if not exists pagos_mp_payment_id_unico
  on public.pagos (mp_payment_id)
  where mp_payment_id is not null;

comment on column public.pagos.concepto is
  'Concepto del pago. membresia para cobros recurrentes; otros valores identifican compras puntuales como taller_hacerle_lugar.';

insert into public.eventos (tipo, titulo, descripcion, fecha_hora, link_externo, nivel_acceso, estado)
select
  'taller_mensual',
  'Encuentro abierto · Valentía en Movimiento',
  'Un espacio para volver a tu sueño, encontrarnos y seguir construyendo en comunidad.',
  '2026-11-10T20:00:00-03:00'::timestamptz,
  null,
  'gratis',
  'publicado'
where not exists (
  select 1 from public.eventos
  where titulo = 'Encuentro abierto · Valentía en Movimiento'
    and fecha_hora = '2026-11-10T20:00:00-03:00'::timestamptz
);

insert into public.eventos (tipo, titulo, descripcion, fecha_hora, link_externo, nivel_acceso, estado)
select
  'taller_mensual',
  'Hacéle lugar a tu sueño',
  'Convertí lo que hoy definiste en un proyecto de 90 días que entre en tu vida real y puedas sostener.',
  '2026-10-13T20:00:00-03:00'::timestamptz,
  null,
  'membresia',
  'publicado'
where not exists (
  select 1 from public.eventos
  where titulo = 'Hacéle lugar a tu sueño'
    and fecha_hora = '2026-10-13T20:00:00-03:00'::timestamptz
);
