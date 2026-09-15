-- =============================================================
-- Valentía en Movimiento — esquema (Fase 0, v2 — auditoría de seguridad)
-- Ejecutar en el SQL Editor de Supabase, de punta a punta, una sola vez,
-- en un proyecto nuevo. Corresponde al modelo de datos v3 del documento
-- de arquitectura + los endurecimientos de la ronda de auditoría.
--
-- Cambios de fondo respecto a la primera versión:
--   1. `usuarios` se separó en `perfiles` (editable por la usuaria) y
--      `autorizaciones` (nivel/rol — SOLO admin o service role).
--   2. Nombres de tabla/columna en ASCII (suenos, sueno_id) en vez de
--      "sueños"/"sueño_id": evita problemas de encoding en URLs de
--      PostgREST y en clientes que no normalizan UTF-8 en querystrings.
--   3. RLS revisada para que el nivel de acceso a contenido/eventos/
--      comunidad se valide en la base, no solo en las queries del
--      frontend; y para que un Proyecto pausado no pueda seguir
--      editándose aunque la usuaria intente escribir directo a la API.
--   4. Constraints e índices que impiden estados imposibles (más de un
--      sueño activo, más de un proyecto activo, registros cruzados
--      entre usuarias).
--   5. Funciones SECURITY DEFINER con search_path fijo.
--
-- Ronda 2 de auditoría (después de revisión del reviewer):
--   6. `proyectos_valentia` (insert/update) exige nivel_actual()='premium',
--      no solo usuario_id = auth.uid(). Nueva función proyecto_editable()
--      centraliza "activo + premium" para progreso/hitos/movimientos/
--      evidencias premium.
--   7. Acceso a `contenidos` unificado en una sola policy de select que
--      usa la función contenido_accesible() — se habían quedado dos
--      policies permissive que Postgres combina con OR, así que la
--      segunda (más restrictiva) no anulaba a la primera. Contenido sin
--      ninguna ubicación ni evento asociado deja de ser accesible por
--      default (antes se trataba como gratis).
--   8. `contenido_ubicaciones` suma nivel_acceso (solo para biblioteca).
--   9. reacciones/comentarios validan la categoría de la publicación al
--      insertar, no solo usuario_id = auth.uid().
--   10. `eventos.grabacion_url` → `eventos.contenido_grabacion_id`,
--       referenciando `contenidos` (tipo taller_grabado) para reutilizar
--       el mismo archivo en etapa/curso/biblioteca sin volver a subirlo.
-- =============================================================

-- ---------- PERFILES (editable por la usuaria) ----------
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  fecha_registro timestamptz not null default now()
);

-- ---------- AUTORIZACIONES (nivel/rol — NUNCA editable por la usuaria) ----
-- Separada de `perfiles` a propósito: así ninguna policy de "edita tu
-- propio perfil" puede terminar habilitando, sin querer, que alguien
-- cambie su propio nivel o rol.
create table if not exists autorizaciones (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nivel text not null default 'gratis' check (nivel in ('gratis','premium')),
  rol text not null default 'miembro' check (rol in ('miembro','editor','admin'))
);

-- Crea perfil + autorización automáticamente al registrarse. security
-- definer porque el usuario recién creado todavía no tiene permisos para
-- insertar en estas tablas por sí mismo — y esto es intencional: nadie
-- más que este trigger puede crear su propia fila de autorización.
create or replace function public.manejar_usuario_nuevo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, new.raw_user_meta_data->>'nombre');

  insert into public.autorizaciones (usuario_id)
  values (new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.manejar_usuario_nuevo();

-- ---------- SUEÑOS ----------
create table if not exists suenos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  descripcion text not null,
  por_que_importa text,
  fecha_creado timestamptz not null default now(),
  estado text not null default 'activo' check (estado in ('activo','archivado'))
);

-- Un solo sueño activo a la vez por usuaria (índice único parcial:
-- solo restringe filas con estado='activo', no todo el historial).
create unique index if not exists un_sueno_activo_por_usuaria
  on suenos (usuario_id) where estado = 'activo';

-- ---------- ETAPAS DE LA RUTA (catálogo fijo, editable por staff) ----------
create table if not exists etapas_ruta (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  orden int not null,
  descripcion text,
  criterios_orientativos text
);

-- ---------- PROYECTOS DE VALENTÍA ----------
create table if not exists proyectos_valentia (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  sueno_id uuid references suenos(id),
  fecha_inicio date not null default current_date,
  fecha_fin_estimada date,
  etapa_actual uuid references etapas_ruta(id),
  identidad_en_practica text,
  estado text not null default 'activo' check (estado in ('activo','pausado','completado'))
);

create unique index if not exists un_proyecto_activo_por_usuaria
  on proyectos_valentia (usuario_id) where estado = 'activo';

-- Un proyecto solo puede referenciar un sueño de la MISMA usuaria.
-- (No se puede expresar como CHECK simple porque necesita comparar contra
-- otra tabla — de ahí el trigger.)
create or replace function public.validar_propiedad_proyecto()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.sueno_id is not null and not exists (
    select 1 from suenos s where s.id = new.sueno_id and s.usuario_id = new.usuario_id
  ) then
    raise exception 'El sueño no pertenece a esta usuaria';
  end if;
  return new;
end;
$$;

drop trigger if exists validar_proyecto_sueno on proyectos_valentia;
create trigger validar_proyecto_sueno
  before insert or update on proyectos_valentia
  for each row execute procedure public.validar_propiedad_proyecto();

create table if not exists progreso_etapas (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos_valentia(id) on delete cascade,
  etapa_id uuid not null references etapas_ruta(id),
  estado text not null default 'bloqueada' check (estado in ('bloqueada','en_curso','completa')),
  fecha_completada timestamptz,
  unique (proyecto_id, etapa_id)
);

create table if not exists hitos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos_valentia(id) on delete cascade,
  etapa_id uuid references etapas_ruta(id),
  titulo text not null,
  fecha_objetivo date,
  estado text not null default 'pendiente' check (estado in ('pendiente','cumplido'))
);

-- ---------- MOVIMIENTOS Y EVIDENCIAS ----------
create table if not exists movimientos_semanales (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  sueno_id uuid references suenos(id),
  proyecto_id uuid references proyectos_valentia(id),
  etapa_id uuid references etapas_ruta(id),
  semana_numero int,
  descripcion text not null,
  fecha_creado timestamptz not null default now(),
  estado text not null default 'planeado' check (estado in ('planeado','cumplido','no_cumplido'))
);

create table if not exists evidencias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  sueno_id uuid references suenos(id),
  proyecto_id uuid references proyectos_valentia(id),
  movimiento_id uuid references movimientos_semanales(id),
  tipo text not null default 'texto' check (tipo in ('texto','foto','ambos')),
  contenido text,
  archivo_url text,
  fecha_creado timestamptz not null default now(),
  compartida_en_comunidad boolean not null default false
);

-- Un movimiento/evidencia solo puede referenciar un sueño, proyecto o
-- movimiento de la MISMA usuaria. Sin esto, RLS por sí sola no impide que
-- alguien intente insertar una fila con su propio usuario_id pero
-- apuntando al proyecto/sueño de otra persona.
create or replace function public.validar_propiedad_movimiento_o_evidencia()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.sueno_id is not null and not exists (
    select 1 from suenos s where s.id = new.sueno_id and s.usuario_id = new.usuario_id
  ) then
    raise exception 'El sueño no pertenece a esta usuaria';
  end if;

  if new.proyecto_id is not null and not exists (
    select 1 from proyectos_valentia p where p.id = new.proyecto_id and p.usuario_id = new.usuario_id
  ) then
    raise exception 'El proyecto no pertenece a esta usuaria';
  end if;

  if TG_TABLE_NAME = 'evidencias' and new.movimiento_id is not null and not exists (
    select 1 from movimientos_semanales m where m.id = new.movimiento_id and m.usuario_id = new.usuario_id
  ) then
    raise exception 'El movimiento no pertenece a esta usuaria';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_propiedad_movimiento on movimientos_semanales;
create trigger validar_propiedad_movimiento
  before insert or update on movimientos_semanales
  for each row execute procedure public.validar_propiedad_movimiento_o_evidencia();

drop trigger if exists validar_propiedad_evidencia on evidencias;
create trigger validar_propiedad_evidencia
  before insert or update on evidencias
  for each row execute procedure public.validar_propiedad_movimiento_o_evidencia();

-- ---------- CONTENIDO REUTILIZABLE (CMS) ----------
create table if not exists contenidos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('clase','meditacion','audio','plantilla','recurso','taller_grabado')),
  titulo text not null,
  descripcion text,
  portada_url text,
  video_url text,
  audio_url text,
  archivo_url text,
  estado text not null default 'borrador' check (estado in ('borrador','programado','publicado','archivado')),
  fecha_publicacion_programada timestamptz,
  creado_por uuid references auth.users(id),
  actualizado_en timestamptz not null default now()
);

create table if not exists cursos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  nivel_acceso text not null default 'gratis' check (nivel_acceso in ('gratis','membresia','compra_individual')),
  precio numeric,
  estado text not null default 'borrador' check (estado in ('borrador','programado','publicado','archivado')),
  orden int not null default 0
);

create table if not exists modulos (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  titulo text not null,
  orden int not null default 0
);

create table if not exists contenido_ubicaciones (
  id uuid primary key default gen_random_uuid(),
  contenido_id uuid not null references contenidos(id) on delete cascade,
  contexto text not null check (contexto in ('etapa','modulo','biblioteca')),
  etapa_id uuid references etapas_ruta(id),
  modulo_id uuid references modulos(id),
  -- Solo aplica (y es obligatorio) cuando contexto='biblioteca': la
  -- biblioteca no tiene un curso/etapa del que heredar el nivel de
  -- acceso, así que se define acá mismo. Para 'etapa' el nivel es
  -- siempre membresía (implícito, ver contenido_accesible()); para
  -- 'modulo' se hereda de `cursos.nivel_acceso`.
  nivel_acceso text check (nivel_acceso in ('gratis','membresia')),
  orden int not null default 0,
  constraint ubicacion_coherente check (
    (contexto = 'etapa' and etapa_id is not null and modulo_id is null and nivel_acceso is null) or
    (contexto = 'modulo' and modulo_id is not null and etapa_id is null and nivel_acceso is null) or
    (contexto = 'biblioteca' and etapa_id is null and modulo_id is null and nivel_acceso is not null)
  )
);

-- ---------- EVENTOS ----------
create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('taller_mensual','laboratorio_movimiento')),
  titulo text not null,
  descripcion text,
  portada_url text,
  fecha_hora timestamptz not null,
  link_externo text,
  -- La grabación NO es un campo de texto suelto: es un `contenidos`
  -- (tipo 'taller_grabado') existente, cargado una sola vez. Así el mismo
  -- video puede, además, ubicarse en una etapa/curso/biblioteca vía
  -- `contenido_ubicaciones` sin volver a subirlo — y si solo se lo asocia
  -- acá, igual queda visible a quien pueda ver el evento (ver
  -- contenido_accesible() más abajo).
  contenido_grabacion_id uuid references contenidos(id),
  nivel_acceso text not null default 'membresia' check (nivel_acceso in ('gratis','membresia')),
  estado text not null default 'borrador' check (estado in ('borrador','programado','publicado','archivado'))
);

-- ---------- COMUNIDAD ----------
create table if not exists categorias_comunidad (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  orden int not null default 0,
  -- true = "Necesito destrabar": una gratuita ve que la categoría existe
  -- (la UI la muestra como bloqueada) pero NO puede leer su contenido.
  solo_premium boolean not null default false,
  solo_admin_publica boolean not null default false
);

insert into categorias_comunidad (nombre, orden, solo_premium, solo_admin_publica) values
  ('Comunidad', 1, false, false),
  ('Sueños', 2, false, false),
  ('Movimientos', 3, false, false),
  ('Evidencias', 4, false, false),
  ('Necesito destrabar', 5, true, false),
  ('Meli', 6, false, true)
on conflict (nombre) do nothing;

create table if not exists publicaciones_comunidad (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  categoria_id uuid not null references categorias_comunidad(id),
  contenido text not null,
  evidencia_id uuid references evidencias(id),
  fecha_creado timestamptz not null default now(),
  destacado boolean not null default false
);

create table if not exists comentarios (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references publicaciones_comunidad(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  contenido text not null,
  fecha_creado timestamptz not null default now()
);

create table if not exists reacciones (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references publicaciones_comunidad(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('corazon','fuego','aplauso')),
  unique (publicacion_id, usuario_id, tipo)
);

-- ---------- PAGOS Y SUSCRIPCIONES ----------
create table if not exists suscripciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  estado text not null default 'activa' check (estado in ('activa','vencida','cancelada')),
  fecha_inicio timestamptz not null default now(),
  fecha_vencimiento timestamptz,
  mp_subscription_id text
);

create table if not exists pagos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  suscripcion_id uuid references suscripciones(id),
  mp_payment_id text,
  monto numeric,
  estado text,
  concepto text default 'membresia',
  fecha timestamptz not null default now()
);

-- =============================================================
-- FUNCIONES HELPER (usadas por las policies de abajo)
-- Todas: security definer + search_path fijo, para que no puedan ser
-- engañadas por un search_path manipulado, y `stable` porque no escriben.
-- =============================================================

create or replace function public.es_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from autorizaciones
    where usuario_id = auth.uid() and rol in ('admin','editor')
  );
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from autorizaciones
    where usuario_id = auth.uid() and rol = 'admin'
  );
$$;

create or replace function public.nivel_actual()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select nivel from autorizaciones where usuario_id = auth.uid()),
    'gratis'
  );
$$;

-- Un proyecto es editable por su dueña solo si: es suya, está activo
-- (no pausado por downgrade) Y su nivel actual sigue siendo premium.
-- El tercer chequeo es defensa en profundidad: si por cualquier motivo
-- el webhook de baja tardara en pausar el proyecto, esto igual bloquea
-- la escritura.
create or replace function public.proyecto_editable(p_proyecto_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from proyectos_valentia p
    where p.id = p_proyecto_id
      and p.usuario_id = auth.uid()
      and p.estado = 'activo'
      and nivel_actual() = 'premium'
  );
$$;

-- Lógica ÚNICA de acceso a un contenido, para no repetir (y desalinear)
-- la misma regla en varias policies permissive que Postgres combina con
-- OR. Un contenido reutilizable puede tener varias `contenido_ubicaciones`
-- (esa es la gracia de no duplicar archivos): es accesible si CUALQUIERA
-- de sus ubicaciones, o el evento que lo usa como grabación, lo permite.
--   - etapa           → siempre exclusivo premium
--   - modulo de curso  → hereda nivel_acceso del curso (gratis/membresia);
--                        'compra_individual' no es accesible todavía
--                        (no existe tabla de compras) salvo para staff
--   - biblioteca       → usa su propio nivel_acceso (gratis/membresia)
--   - grabación de evento → visible si el evento en sí es visible
-- Sin ninguna ubicación ni evento asociado: NO accesible para miembros
-- (evita que algo "publicado" pero mal cargado quede público por
-- default) — solo staff, vía su policy `contenidos_staff` aparte.
create or replace function public.contenido_accesible(p_contenido_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from contenido_ubicaciones u
    left join modulos m on m.id = u.modulo_id
    left join cursos c on c.id = m.curso_id
    where u.contenido_id = p_contenido_id
      and (
        (u.contexto = 'etapa' and nivel_actual() = 'premium')
        or (u.contexto = 'biblioteca' and (
          u.nivel_acceso = 'gratis' or (u.nivel_acceso = 'membresia' and nivel_actual() = 'premium')
        ))
        or (u.contexto = 'modulo' and (
          c.nivel_acceso = 'gratis' or (c.nivel_acceso = 'membresia' and nivel_actual() = 'premium')
        ))
      )
  ) or exists (
    select 1 from eventos e
    where e.contenido_grabacion_id = p_contenido_id
      and e.estado = 'publicado'
      and (e.nivel_acceso = 'gratis' or nivel_actual() = 'premium')
  );
$$;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

alter table perfiles enable row level security;
alter table autorizaciones enable row level security;
alter table suenos enable row level security;
alter table proyectos_valentia enable row level security;
alter table progreso_etapas enable row level security;
alter table hitos enable row level security;
alter table movimientos_semanales enable row level security;
alter table evidencias enable row level security;
alter table contenidos enable row level security;
alter table cursos enable row level security;
alter table modulos enable row level security;
alter table contenido_ubicaciones enable row level security;
alter table eventos enable row level security;
alter table categorias_comunidad enable row level security;
alter table publicaciones_comunidad enable row level security;
alter table comentarios enable row level security;
alter table reacciones enable row level security;
alter table suscripciones enable row level security;
alter table pagos enable row level security;
alter table etapas_ruta enable row level security;

-- perfiles: cada quien ve/edita el propio (solo `nombre` importa acá);
-- staff puede leer todo para el panel de miembros.
create policy "perfiles_select" on perfiles for select using (id = auth.uid() or es_staff());
create policy "perfiles_update_propio" on perfiles for update using (id = auth.uid()) with check (id = auth.uid());

-- autorizaciones: CLAVE DE SEGURIDAD. Una usuaria puede LEER su propia
-- fila (para saber si es premium) pero no existe policy de INSERT/UPDATE
-- para 'miembro' — la única vía de escritura normal es el trigger de
-- alta (security definer) y, para cambios posteriores, un admin real o
-- el service role (usado por el webhook de Mercado Pago, que bypassea
-- RLS por diseño). Un editor tampoco puede tocar esta tabla: cambiar
-- nivel/rol es management de negocio, no gestión de contenido.
create policy "autorizaciones_select" on autorizaciones for select using (usuario_id = auth.uid() or es_staff());
create policy "autorizaciones_update_admin" on autorizaciones for update using (es_admin()) with check (es_admin());

-- suenos: dueño total (CRUD sobre lo propio); staff con lectura para
-- soporte/moderación.
create policy "suenos_propio" on suenos for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "suenos_staff_lectura" on suenos for select using (es_staff());

-- proyectos_valentia: lectura siempre (incluso pausado, para el historial
-- read-only); creación y escritura SOLO si es premium — antes solo se
-- exigía usuario_id = auth.uid(), lo que dejaba crear un Proyecto siendo
-- gratuita. Update además exige estado='activo': es lo que blinda el
-- downgrade a nivel de base, un proyecto pausado no acepta updates aunque
-- la usuaria llame a la API directo.
create policy "proyectos_select" on proyectos_valentia for select using (usuario_id = auth.uid() or es_staff());
create policy "proyectos_insert" on proyectos_valentia for insert with check (
  usuario_id = auth.uid() and nivel_actual() = 'premium'
);
create policy "proyectos_update_si_activo" on proyectos_valentia for update
  using (usuario_id = auth.uid() and estado = 'activo' and nivel_actual() = 'premium')
  with check (usuario_id = auth.uid());

-- progreso_etapas / hitos: lectura siempre; escritura solo si el proyecto
-- dueño es editable (activo Y la usuaria sigue siendo premium).
create policy "progreso_select" on progreso_etapas for select using (
  exists (select 1 from proyectos_valentia p where p.id = proyecto_id and (p.usuario_id = auth.uid() or es_staff()))
);
create policy "progreso_write_si_activo" on progreso_etapas for all using (
  proyecto_editable(proyecto_id)
) with check (
  proyecto_editable(proyecto_id)
);

create policy "hitos_select" on hitos for select using (
  exists (select 1 from proyectos_valentia p where p.id = proyecto_id and (p.usuario_id = auth.uid() or es_staff()))
);
create policy "hitos_write_si_activo" on hitos for all using (
  proyecto_editable(proyecto_id)
) with check (
  proyecto_editable(proyecto_id)
);

-- movimientos_semanales / evidencias: escritura permitida si NO tienen
-- proyecto asociado (caso usuaria gratuita, sobre su sueño) o si el
-- proyecto asociado es editable (caso premium). Lectura siempre.
create policy "movimientos_select" on movimientos_semanales for select using (usuario_id = auth.uid() or es_staff());
create policy "movimientos_write" on movimientos_semanales for all using (
  usuario_id = auth.uid() and (proyecto_id is null or proyecto_editable(proyecto_id))
) with check (
  usuario_id = auth.uid() and (proyecto_id is null or proyecto_editable(proyecto_id))
);

create policy "evidencias_select" on evidencias for select using (usuario_id = auth.uid() or es_staff());
create policy "evidencias_write" on evidencias for all using (
  usuario_id = auth.uid() and (proyecto_id is null or proyecto_editable(proyecto_id))
) with check (
  usuario_id = auth.uid() and (proyecto_id is null or proyecto_editable(proyecto_id))
);

-- etapas_ruta: catálogo de lectura pública para autenticadas, escritura
-- solo staff.
create policy "etapas_lectura" on etapas_ruta for select using (auth.role() = 'authenticated');
create policy "etapas_escritura_staff" on etapas_ruta for all using (es_staff()) with check (es_staff());

-- CMS: staff CRUD total. Lectura de miembros: UNA sola policy de select,
-- a propósito — dos policies permissive de select se combinan con OR, así
-- que agregar una segunda "más restrictiva" (como había antes) no anula a
-- la primera si esta ya dejaba pasar de más. Toda la lógica de nivel de
-- acceso vive en la función contenido_accesible() de arriba.
create policy "contenidos_staff" on contenidos for all using (es_staff()) with check (es_staff());
create policy "contenidos_lectura" on contenidos for select using (
  estado = 'publicado' and contenido_accesible(id)
);

create policy "cursos_staff" on cursos for all using (es_staff()) with check (es_staff());
create policy "cursos_lectura" on cursos for select using (
  estado = 'publicado' and (
    nivel_acceso = 'gratis'
    or (nivel_acceso = 'membresia' and nivel_actual() = 'premium')
  )
);

create policy "modulos_staff" on modulos for all using (es_staff()) with check (es_staff());
create policy "modulos_lectura" on modulos for select using (
  exists (
    select 1 from cursos c where c.id = curso_id and c.estado = 'publicado' and (
      c.nivel_acceso = 'gratis' or (c.nivel_acceso = 'membresia' and nivel_actual() = 'premium')
    )
  )
);

create policy "ubicaciones_staff" on contenido_ubicaciones for all using (es_staff()) with check (es_staff());
create policy "ubicaciones_lectura" on contenido_ubicaciones for select using (auth.role() = 'authenticated');

create policy "eventos_staff" on eventos for all using (es_staff()) with check (es_staff());
create policy "eventos_lectura" on eventos for select using (
  estado = 'publicado' and (nivel_acceso = 'gratis' or nivel_actual() = 'premium')
);

-- Comunidad
create policy "categorias_lectura" on categorias_comunidad for select using (auth.role() = 'authenticated');
create policy "categorias_staff" on categorias_comunidad for all using (es_staff()) with check (es_staff());

-- Lectura de publicaciones: bloqueada de verdad para "Necesito destrabar"
-- si la usuaria no es premium (no solo oculta en la UI).
create policy "publicaciones_select" on publicaciones_comunidad for select using (
  es_staff() or exists (
    select 1 from categorias_comunidad c
    where c.id = categoria_id and (c.solo_premium = false or nivel_actual() = 'premium')
  )
);
create policy "publicaciones_insert" on publicaciones_comunidad for insert with check (
  usuario_id = auth.uid()
  and exists (
    select 1 from categorias_comunidad c where c.id = categoria_id and (
      -- "Meli": solo staff publica.
      (c.solo_admin_publica = false or es_staff())
      -- "Necesito destrabar": solo premium (o staff) publica.
      and (c.solo_premium = false or nivel_actual() = 'premium' or es_staff())
    )
  )
);
create policy "publicaciones_delete_propio" on publicaciones_comunidad for delete using (usuario_id = auth.uid() or es_staff());

create policy "comentarios_select" on comentarios for select using (
  es_staff() or exists (
    select 1 from publicaciones_comunidad p
    join categorias_comunidad c on c.id = p.categoria_id
    where p.id = publicacion_id and (c.solo_premium = false or nivel_actual() = 'premium')
  )
);
create policy "comentarios_insert" on comentarios for insert with check (
  usuario_id = auth.uid()
  and exists (
    select 1 from publicaciones_comunidad p
    join categorias_comunidad c on c.id = p.categoria_id
    where p.id = publicacion_id and (c.solo_premium = false or nivel_actual() = 'premium' or es_staff())
  )
);
create policy "comentarios_delete_propio" on comentarios for delete using (usuario_id = auth.uid() or es_staff());

create policy "reacciones_select" on reacciones for select using (
  es_staff() or exists (
    select 1 from publicaciones_comunidad p
    join categorias_comunidad c on c.id = p.categoria_id
    where p.id = publicacion_id and (c.solo_premium = false or nivel_actual() = 'premium')
  )
);
-- Antes solo chequeaba usuario_id = auth.uid(): una gratuita que conociera
-- el UUID de una publicación de "Necesito destrabar" podía reaccionarle
-- igual. Ahora exige la misma condición de acceso que la lectura.
create policy "reacciones_insert" on reacciones for insert with check (
  usuario_id = auth.uid()
  and exists (
    select 1 from publicaciones_comunidad p
    join categorias_comunidad c on c.id = p.categoria_id
    where p.id = publicacion_id and (c.solo_premium = false or nivel_actual() = 'premium' or es_staff())
  )
);
create policy "reacciones_delete_propio" on reacciones for delete using (usuario_id = auth.uid());

-- Pagos y suscripciones: SOLO lectura de lo propio desde el cliente. La
-- escritura la hace exclusivamente el service role desde el webhook de
-- Mercado Pago (Fase 6) — bypassea RLS por diseño, así que a propósito
-- NO hay policy de insert/update acá (ninguna = nadie con la clave
-- publishable puede escribir, ni siquiera un admin logueado normal).
create policy "suscripciones_lectura_propia" on suscripciones for select using (usuario_id = auth.uid() or es_staff());
create policy "pagos_lectura_propia" on pagos for select using (usuario_id = auth.uid() or es_staff());

-- Semilla inicial de las 5 etapas de la ruta.
insert into etapas_ruta (nombre, orden) values
  ('DEFINÍ', 1),
  ('CONSTRUÍTE', 2),
  ('DISEÑÁ', 3),
  ('MOVETE', 4),
  ('SOSTENÉ', 5)
on conflict do nothing;
