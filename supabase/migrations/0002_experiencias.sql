-- =============================================================
-- Valentía en Movimiento — migración 0002: experiencias administrables
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de supabase/schema.sql.
-- Es aditiva: no modifica ni borra ninguna tabla existente, así que es
-- segura de correr sobre el proyecto real ya en uso.
--
-- Qué agrega:
--   1. `experiencias` / `preguntas_experiencia`: el contenido del recorrido
--      (Mi Sueño y, más adelante, cada etapa premium), administrable desde
--      /admin sin tocar código. Una experiencia puede no tener video
--      todavía (texto + preguntas alcanza) y puede quedar en 'borrador'
--      para no mostrarse a las alumnas.
--   2. `respuestas_experiencia`: cada respuesta se guarda una sola vez por
--      usuaria+pregunta (upsert) y queda etiquetada con el área de Mi
--      Proyecto a la que alimenta (`area_respuesta`). El área NO la manda
--      el cliente: un trigger la copia siempre desde la pregunta, así que
--      no se puede escribir en un área ajena a la pregunta respondida.
--   3. `experiencias_completadas`: marca simple de "esta usuaria terminó
--      esta experiencia", para las etiquetas Hecha/Ahora/Pendiente de Mi
--      Ruta.
--   4. `publicaciones_comunidad.movimiento_id`: columna nueva (nullable)
--      para poder compartir un Movimiento en Comunidad igual que ya se
--      podía compartir una Evidencia (`evidencia_id`, ya existía).
-- =============================================================

-- ---------- EXPERIENCIAS (contenido administrable) ----------
create table if not exists experiencias (
  id uuid primary key default gen_random_uuid(),
  -- null = recorrido de entrada "Mi Sueño" (previo a tener Proyecto).
  -- Con etapa = pertenece a una de las 5 etapas del Proyecto (premium).
  etapa_id uuid references etapas_ruta(id),
  titulo text not null,
  descripcion text,
  texto_intro text,
  video_url text,
  nivel_acceso text not null default 'gratis' check (nivel_acceso in ('gratis','membresia')),
  estado text not null default 'borrador' check (estado in ('borrador','publicado','archivado')),
  orden int not null default 0,
  creado_por uuid references auth.users(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists preguntas_experiencia (
  id uuid primary key default gen_random_uuid(),
  experiencia_id uuid not null references experiencias(id) on delete cascade,
  texto text not null,
  placeholder text,
  -- Área de "Mi Proyecto" que alimenta esta respuesta. 'libre' = no mapea a
  -- ningún campo fijo del Proyecto, queda solo como respuesta guardada.
  area_respuesta text not null default 'libre' check (area_respuesta in (
    'sueno','para_que','punto_partida','identidad','decision','estandar',
    'resultado_90_dias','hito','movimiento','libre'
  )),
  orden int not null default 0
);

-- ---------- RESPUESTAS (reutilizable: cualquier experiencia futura puede
-- escribir en cualquier área de Mi Proyecto sin tocar código) ----------
create table if not exists respuestas_experiencia (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  pregunta_id uuid not null references preguntas_experiencia(id) on delete cascade,
  -- Denormalizados desde la pregunta por el trigger de abajo — nunca los
  -- manda el cliente — para poder indexar/filtrar por experiencia y área
  -- sin un join en cada lectura de Mi Proyecto.
  experiencia_id uuid not null references experiencias(id) on delete cascade,
  area_respuesta text not null,
  respuesta text not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (usuario_id, pregunta_id)
);

-- Copia experiencia_id + area_respuesta desde la pregunta real, siempre.
-- Así aunque alguien intente insertar con área distinta a la de la
-- pregunta (llamando directo a la API), la fila igual queda con el área
-- correcta — no hay forma de que una respuesta "aterrice" en la sección
-- equivocada de Mi Proyecto.
create or replace function public.derivar_area_respuesta()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select p.experiencia_id, p.area_respuesta
    into new.experiencia_id, new.area_respuesta
    from preguntas_experiencia p
    where p.id = new.pregunta_id;

  if new.experiencia_id is null then
    raise exception 'La pregunta no existe';
  end if;

  return new;
end;
$$;

drop trigger if exists derivar_area_respuesta on respuestas_experiencia;
create trigger derivar_area_respuesta
  before insert or update on respuestas_experiencia
  for each row execute procedure public.derivar_area_respuesta();

-- ---------- EXPERIENCIAS COMPLETADAS (para Hecha/Ahora/Pendiente) ----------
create table if not exists experiencias_completadas (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  experiencia_id uuid not null references experiencias(id) on delete cascade,
  completado_en timestamptz not null default now(),
  primary key (usuario_id, experiencia_id)
);

-- ---------- COMUNIDAD: compartir un Movimiento (ya se podía compartir una
-- Evidencia vía evidencia_id, que ya existía en supabase/schema.sql) ------
alter table publicaciones_comunidad
  add column if not exists movimiento_id uuid references movimientos_semanales(id);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table experiencias enable row level security;
alter table preguntas_experiencia enable row level security;
alter table respuestas_experiencia enable row level security;
alter table experiencias_completadas enable row level security;

-- experiencias: mismo patrón que `cursos`/`contenidos` en schema.sql — una
-- sola policy de select para miembros (borrador nunca es visible para
-- ellas, publicado respeta nivel_acceso vs. nivel_actual()) y una policy
-- separada de staff con acceso total (incluye ver/editar borradores).
create policy "experiencias_staff" on experiencias for all using (es_staff()) with check (es_staff());
create policy "experiencias_lectura" on experiencias for select using (
  estado = 'publicado' and (nivel_acceso = 'gratis' or nivel_actual() = 'premium')
);

create policy "preguntas_staff" on preguntas_experiencia for all using (es_staff()) with check (es_staff());
create policy "preguntas_lectura" on preguntas_experiencia for select using (
  exists (
    select 1 from experiencias e
    where e.id = experiencia_id
      and e.estado = 'publicado'
      and (e.nivel_acceso = 'gratis' or nivel_actual() = 'premium')
  )
);

-- respuestas: cada quien ve/escribe únicamente las propias. El insert/update
-- además exige que la experiencia de la pregunta sea accesible para su
-- nivel actual — si no, una gratuita podría responder preguntas premium
-- adivinando el id de la pregunta, aunque nunca llegara a verlas en la UI.
create policy "respuestas_select" on respuestas_experiencia for select using (
  usuario_id = auth.uid() or es_staff()
);
create policy "respuestas_write" on respuestas_experiencia for all using (
  usuario_id = auth.uid()
) with check (
  usuario_id = auth.uid()
  and exists (
    select 1 from preguntas_experiencia p
    join experiencias e on e.id = p.experiencia_id
    where p.id = pregunta_id
      and e.estado = 'publicado'
      and (e.nivel_acceso = 'gratis' or nivel_actual() = 'premium')
  )
);

create policy "completadas_select" on experiencias_completadas for select using (
  usuario_id = auth.uid() or es_staff()
);
create policy "completadas_write" on experiencias_completadas for all using (
  usuario_id = auth.uid()
) with check (
  usuario_id = auth.uid()
);

-- =============================================================
-- CONTENIDO DEMO (provisorio, para poder probar el flujo sin videos
-- definitivos — ver STATUS.md). Todo esto se puede editar/borrar desde
-- /admin sin volver a tocar SQL.
-- =============================================================

-- Recorrido de entrada "Mi Sueño" (etapa_id null, gratis, publicado).
insert into experiencias (titulo, descripcion, texto_intro, nivel_acceso, estado, orden)
select * from (values
  (
    'Un sueño no es un capricho',
    'Clase 1 · Bienvenida · Video de 4 min + una pregunta',
    E'Lo primero que hacemos con un sueño es bajarle el precio. Le decimos "algún día", "cuando tenga tiempo", "si se da". Así el sueño sigue vivo pero sin cuerpo: no molesta, no cuesta, no pasa nada.\n\nTomarte un sueño en serio es, antes que nada, dejar de tratarlo como un lujo. Es darle un lugar en tu semana, no en tu fantasía.\n\n"Un sueño al que no le das tiempo no es un sueño: es una nostalgia adelantada."',
    'gratis', 'publicado', 1
  ),
  (
    'La valentía se entrena',
    'Clase 2 · Bienvenida · Video de 5 min + una pregunta',
    E'La valentía no es la ausencia de miedo ni un rasgo de personalidad que algunas tienen y otras no. Es una serie de decisiones chicas, repetidas, en presencia del miedo.\n\nPor eso acá no vas a esperar a sentirte lista. Vas a moverte primero y dejar que la confianza llegue después, como consecuencia.\n\n"Primero el movimiento. La certeza viene atrás."',
    'gratis', 'publicado', 2
  ),
  (
    'Noventa días es una promesa, no una carrera',
    'Clase 3 · Bienvenida · Video de 6 min + una pregunta',
    E'Noventa días alcanzan para que algo real cambie y son lo bastante cortos como para no perderte. No se trata de acelerar: se trata de sostener.\n\nSostener implica elegir. Durante estos tres meses algo va a tener que ocupar menos lugar para que tu proyecto ocupe el suyo.\n\n"No vas a hacer más cosas. Vas a hacer otras."',
    'gratis', 'publicado', 3
  ),
  (
    'Declará tu Proyecto de Valentía',
    'Paso 4 · Tu declaración · Noventa días, un sueño, en tus palabras',
    'Lo vas a poder ajustar, pero no vas a poder borrarlo: queda como tu punto de partida.',
    'gratis', 'publicado', 4
  )
) as t(titulo, descripcion, texto_intro, nivel_acceso, estado, orden)
where not exists (select 1 from experiencias where etapa_id is null);

insert into preguntas_experiencia (experiencia_id, texto, placeholder, area_respuesta, orden)
select e.id, v.texto, v.placeholder, v.area_respuesta, v.orden
from experiencias e
join (values
  ('Un sueño no es un capricho', '¿Qué sueño volvés a escuchar aunque lo calles?', 'Escribilo como te salga, sin justificarlo.', 'punto_partida', 1),
  ('La valentía se entrena', '¿Cuál fue la última vez que hiciste algo que te daba miedo y lo hiciste igual?', 'Contalo en dos o tres líneas. Fijate qué te sostuvo.', 'libre', 1),
  ('Noventa días es una promesa, no una carrera', '¿Qué vas a tener que soltar para sostener estos 90 días?', 'Puede ser una tarea, una expectativa o una manera de hacer las cosas.', 'estandar', 1),
  ('Declará tu Proyecto de Valentía', 'Mi sueño, en una frase', 'Nombralo como si ya estuviera pasando.', 'sueno', 1),
  ('Declará tu Proyecto de Valentía', 'Por qué este sueño y por qué ahora', 'Lo que lo hace importante hoy, no en abstracto.', 'para_que', 2),
  ('Declará tu Proyecto de Valentía', 'Cómo se ve el día 90', 'Algo concreto que vas a poder mirar y decir "esto pasó".', 'resultado_90_dias', 3),
  ('Declará tu Proyecto de Valentía', 'Mi primer acto de valentía esta semana', 'Un paso chico que puedas hacer esta semana, aunque te dé algo de miedo.', 'movimiento', 4)
) as v(titulo, texto, placeholder, area_respuesta, orden) on v.titulo = e.titulo
where e.etapa_id is null
  and not exists (select 1 from preguntas_experiencia pe where pe.experiencia_id = e.id);

-- Primera experiencia Premium, en la etapa CONSTRUÍTE — para validar todo
-- el circuito de acceso + Mi Proyecto en Premium (ver punto 10 del pedido).
insert into experiencias (etapa_id, titulo, descripcion, texto_intro, nivel_acceso, estado, orden)
select et.id,
  'Diseño de tu nueva identidad',
  'Construíte · Experiencia 4 · Video · Melisa · 11 min',
  E'Un sueño nuevo no lo sostiene la persona que fuiste hasta hoy. Lo sostiene una versión tuya que todavía estás estrenando: la que responde distinto cuando aparece el miedo, la incomodidad o la posibilidad de quedar mal.\n\nDiseñar tu identidad no es inventarte otra. Es decidir, con nombre y apellido, qué vas a practicar estos noventa días hasta que deje de sentirse actuado.\n\n"No se trata de ser otra. Se trata de practicar ser la que ya decidió."\n\nLa valentía no es la ausencia de miedo ni un rasgo de personalidad que algunas tienen y otras no. Es una serie de decisiones chicas, repetidas, en presencia del miedo.\n\nPor eso acá no vas a esperar a sentirte lista. Vas a moverte primero y dejar que la confianza llegue después, como consecuencia.\n\n"Primero el movimiento. La certeza viene atrás."',
  'membresia', 'publicado', 4
from etapas_ruta et
where et.nombre = 'CONSTRUÍTE'
  and not exists (select 1 from experiencias where titulo = 'Diseño de tu nueva identidad');

insert into preguntas_experiencia (experiencia_id, texto, placeholder, area_respuesta, orden)
select e.id, v.texto, v.placeholder, v.area_respuesta, v.orden
from experiencias e
join (values
  ('¿Quién necesitás practicar ser para sostener este sueño?', 'Describila en presente, como si ya fueras ella.', 'identidad', 1),
  ('¿Qué decisión tu versión anterior no tomaría?', 'Una decisión concreta, no una actitud.', 'decision', 2),
  ('¿Qué estándar nuevo querés practicar?', 'Algo que puedas cumplir o romper esta semana.', 'estandar', 3),
  ('¿Qué vas a hacer esta semana, coherente con esta identidad?', 'Una acción concreta que tu nueva identidad haría esta semana.', 'movimiento', 4)
) as v(texto, placeholder, area_respuesta, orden) on true
where e.titulo = 'Diseño de tu nueva identidad'
  and not exists (select 1 from preguntas_experiencia pe where pe.experiencia_id = e.id);
