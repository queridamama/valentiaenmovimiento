-- =============================================================
-- Valentía en Movimiento — migración 0010: módulos dentro de cada etapa,
-- seguimiento de "dónde quedó" en la Ruta, y novedades de Inicio.
--
-- Parte de la evolución de producto: ETAPA → MÓDULOS → EXPERIENCIAS. Es
-- aditiva y segura — no borra ni renombra nada existente, y no cambia el
-- comportamiento de ninguna experiencia hasta que se le asigne un
-- `modulo_id` (eso lo hace la migración 0011, aparte, por título).
-- =============================================================

-- ---------- MÓDULOS DE RUTA ----------
-- Entidad real y propia (no reutiliza `cursos`/`modulos` de
-- 0005_cms_admin.sql — eso es para los mini cursos gratuitos de
-- Biblioteca, un concepto distinto sin relación con las 5 etapas del
-- método). Las 5 etapas (`etapas_ruta`) NO cambian: siguen siendo el
-- catálogo fijo de siempre. Un módulo pertenece a una sola etapa.
create table if not exists modulos_ruta (
  id uuid primary key default gen_random_uuid(),
  etapa_id uuid not null references etapas_ruta(id),
  titulo text not null,
  descripcion text,
  orden int not null default 0,
  estado text not null default 'borrador' check (estado in ('borrador','publicado','archivado')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- `etapa_id` en `experiencias` NO se quita: sigue siendo la referencia
-- directa a la etapa (varias pantallas y queries actuales dependen de
-- ella). `modulo_id` es aditivo — nullable a propósito, así una
-- experiencia puede seguir sin módulo (DISEÑÁ/MOVETE/SOSTENÉ, por ahora)
-- sin romper nada.
alter table experiencias
  add column if not exists modulo_id uuid references modulos_ruta(id);

-- ---------- "DÓNDE QUEDÓ" EN LA RUTA ----------
-- `experiencias_completadas` alcanza para saber QUÉ terminó, pero no CUÁL
-- fue la última que visitó (para "Seguí donde quedaste" en Inicio). Se
-- agrega a `perfiles` en vez de crear una tabla nueva: es un dato 1:1 por
-- usuaria, `perfiles` ya es su lugar natural y ya tiene RLS de "cada
-- quien edita lo propio" (`perfiles_update_propio`), que ya cubre
-- cualquier columna nueva sin tocar policies.
alter table perfiles
  add column if not exists ultima_experiencia_ruta_id uuid references experiencias(id),
  add column if not exists ultima_visita_ruta_en timestamptz;

comment on column perfiles.ultima_experiencia_ruta_id is 'Última experiencia de Ruta (Mi Sueño o Ruta Premium) que la usuaria abrió estando todavía sin completar. Se actualiza solo al ENTRAR a una experiencia incompleta — nunca al revisar una ya hecha, para que "Seguí donde quedaste" nunca retroceda.';
comment on column perfiles.ultima_visita_ruta_en is 'Momento de esa última visita — solo informativo, no se usa para ordenar nada crítico todavía.';

-- ---------- NOVEDADES DE INICIO ----------
-- Una sola novedad protagonista por vez, debajo de "Seguí donde quedaste"
-- — nunca reemplazándolo. `href` es deliberadamente una URL interna
-- libre (no una FK a `experiencias` ni a `contenidos`): así puede apuntar
-- a una meditación, un video, un mini curso, un evento o cualquier otra
-- pantalla futura sin tener que ampliar el esquema cada vez.
create table if not exists novedades_inicio (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  tipo text not null default 'contenido' check (tipo in (
    'meditacion','video','contenido','curso','evento','encuentro','recurso','url'
  )),
  imagen_url text,
  href text not null,
  nivel_acceso text not null default 'gratis' check (nivel_acceso in ('gratis','membresia')),
  estado text not null default 'borrador' check (estado in ('borrador','publicado','archivado')),
  destacado boolean not null default false,
  publicado_desde timestamptz not null default now(),
  publicado_hasta timestamptz,
  creado_en timestamptz not null default now()
);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table modulos_ruta enable row level security;
alter table novedades_inicio enable row level security;

-- modulos_ruta: mismo patrón que `experiencias` — staff con acceso total
-- (incluye borradores, para armar el módulo antes de publicarlo), lectura
-- de miembros solo si está publicado. El acceso real a cada experiencia
-- lo sigue filtrando `experiencias_lectura` por nivel_acceso; el módulo
-- en sí no discrimina Gratis/Premium, solo agrupa.
create policy "modulos_ruta_staff" on modulos_ruta for all using (es_staff()) with check (es_staff());
create policy "modulos_ruta_lectura" on modulos_ruta for select using (estado = 'publicado');

create policy "novedades_staff" on novedades_inicio for all using (es_staff()) with check (es_staff());
create policy "novedades_lectura" on novedades_inicio for select using (
  estado = 'publicado'
  and (nivel_acceso = 'gratis' or nivel_actual() = 'premium')
  and publicado_desde <= now()
  and (publicado_hasta is null or publicado_hasta > now())
);
