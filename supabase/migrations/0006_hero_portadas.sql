-- =============================================================
-- Valentía en Movimiento — migración 0006: hero de Home + portada de
-- experiencias. Ejecutar en el SQL Editor de Supabase después de
-- 0001–0005. Aditiva: agrega una tabla nueva y una columna nueva
-- (nullable), no borra ni modifica nada existente.
--
-- 1. `configuracion_home`: fila única con el "hero" editorial del Home
--    (imagen, eyebrow, título, bajada). Se lee desde /inicio y se edita
--    desde /admin/inicio — no hace falta tocar código para cambiar la
--    foto o el texto de portada más adelante. Se precarga con una fila
--    default para que el Home tenga contenido real desde el primer
--    deploy, sin depender de que alguien la configure antes.
-- 2. `experiencias.portada_url`: imagen de portada opcional por
--    experiencia (usa el mismo bucket público "medios-publicos" que ya
--    usan las portadas de Biblioteca y Eventos — sin infraestructura
--    nueva de Storage).
-- =============================================================

create table if not exists configuracion_home (
  id text primary key default 'home',
  eyebrow text,
  titulo text,
  bajada text,
  imagen_url text,
  actualizado_en timestamptz not null default now(),
  constraint configuracion_home_singleton check (id = 'home')
);

insert into configuracion_home (id, eyebrow, titulo, bajada)
values (
  'home',
  'Valentía en Movimiento',
  'Tomate tus sueños en serio',
  'Un lugar para volver cada semana, con tu sueño y tu próximo movimiento.'
)
on conflict (id) do nothing;

alter table configuracion_home enable row level security;

-- Lectura: cualquier usuaria logueada (es la portada del Home, no hay
-- nada sensible). Escritura: solo staff.
create policy "configuracion_home_lectura" on configuracion_home for select
  using (auth.role() = 'authenticated');

create policy "configuracion_home_staff" on configuracion_home for all
  using (es_staff())
  with check (es_staff());

alter table experiencias
  add column if not exists portada_url text;
