-- Biblioteca ya tenía toda su estructura real (contenidos, cursos,
-- modulos, contenido_ubicaciones con RLS vía contenido_accesible()) desde
-- 0005_cms_admin.sql — no hacía falta ninguna tabla nueva para la sección
-- de usuaria en /biblioteca.
--
-- Lo único que faltaba: un lugar para la duración opcional de un
-- contenido ("12 min", "3 páginas", etc.), pedida para el formulario de
-- Admin. Columna nueva, nullable, sin default que rompa nada existente.

alter table contenidos add column if not exists duracion text;
