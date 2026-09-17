import type { SupabaseClient } from "@supabase/supabase-js";
import type { AreaRespuesta } from "@/lib/tipos";

// La forma en que supabase-js tipa una relación embebida a-uno (ej. la
// `perfiles` de quien publicó) varía según la versión: a veces objeto, a
// veces array de un elemento. Este helper la normaliza en un solo lugar en
// vez de repetir el Array.isArray en cada página.
export function unoDeRelacion<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

// Helpers de lectura reutilizados por varias páginas. Todo pasa por el
// cliente de servidor con cookies de la usuaria (nunca service role), así
// que cada query ya respeta RLS: no hace falta repetir el filtro de nivel
// acá, la base lo hace.

export async function obtenerAutorizacion(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("autorizaciones")
    .select("nivel, rol")
    .eq("usuario_id", userId)
    .maybeSingle();
  return data ?? { nivel: "gratis" as const, rol: "miembro" as const };
}

export async function obtenerSuenoActivo(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("suenos")
    .select("id, descripcion, por_que_importa, fecha_creado")
    .eq("usuario_id", userId)
    .eq("estado", "activo")
    .maybeSingle();
  return data;
}

// Hero editable del Home (ver 0006_hero_portadas.sql). Siempre hay una
// fila (se precarga en la migración), pero por las dudas se cubre el caso
// sin fila con valores por default razonables.
export async function obtenerConfiguracionHome(supabase: SupabaseClient) {
  const { data } = await supabase.from("configuracion_home").select("*").eq("id", "home").maybeSingle();
  return (
    data ?? {
      eyebrow: "Valentía en Movimiento",
      titulo: "Tomate tus sueños en serio",
      bajada: "Un lugar para volver cada semana.",
      imagen_url: null as string | null,
    }
  );
}

// Recorrido de entrada: experiencias sin etapa (etapa_id is null), en orden.
export async function obtenerRecorridoEntrada(supabase: SupabaseClient, userId: string) {
  const { data: experiencias } = await supabase
    .from("experiencias")
    .select("id, titulo, descripcion, texto_intro, video_url, audio_url, duracion, tipo, portada_url, nivel_acceso, estado, orden")
    .is("etapa_id", null)
    // Sin esto, una experiencia de Ruta Premium importada (etapa_id null
    // hasta que Admin le asigne una etapa real) se colaría acá apenas se
    // publicara — ver comentario en supabase/migrations/0009_*.sql.
    .eq("es_recorrido_entrada", true)
    .eq("estado", "publicado")
    .order("orden", { ascending: true });

  const { data: completadas } = await supabase
    .from("experiencias_completadas")
    .select("experiencia_id")
    .eq("usuario_id", userId);

  const completadasSet = new Set((completadas ?? []).map((c) => c.experiencia_id));
  return (experiencias ?? []).map((e) => ({ ...e, completada: completadasSet.has(e.id) }));
}

// Ruta premium: etapas con sus experiencias publicadas accesibles para la
// usuaria (RLS ya filtra por nivel_acceso vs. nivel_actual()).
export async function obtenerRuta(supabase: SupabaseClient, userId: string) {
  const { data: etapas } = await supabase
    .from("etapas_ruta")
    .select("id, nombre, orden, descripcion")
    .order("orden", { ascending: true });

  const { data: experiencias } = await supabase
    .from("experiencias")
    .select("id, etapa_id, titulo, descripcion, video_url, audio_url, duracion, tipo, portada_url, nivel_acceso, estado, orden")
    .not("etapa_id", "is", null)
    .eq("estado", "publicado")
    .order("orden", { ascending: true });

  const { data: completadas } = await supabase
    .from("experiencias_completadas")
    .select("experiencia_id")
    .eq("usuario_id", userId);
  const completadasSet = new Set((completadas ?? []).map((c) => c.experiencia_id));

  return (etapas ?? []).map((etapa) => ({
    ...etapa,
    experiencias: (experiencias ?? [])
      .filter((e) => e.etapa_id === etapa.id)
      .map((e) => ({ ...e, completada: completadasSet.has(e.id) })),
  }));
}

export async function obtenerExperienciaConPreguntas(supabase: SupabaseClient, experienciaId: string, userId: string) {
  const { data: experiencia } = await supabase
    .from("experiencias")
    .select("id, etapa_id, titulo, descripcion, texto_intro, video_url, audio_url, duracion, tipo, portada_url, nivel_acceso, estado, orden")
    .eq("id", experienciaId)
    .maybeSingle();
  if (!experiencia) return null;

  const { data: preguntas } = await supabase
    .from("preguntas_experiencia")
    .select("id, experiencia_id, texto, placeholder, area_respuesta, orden")
    .eq("experiencia_id", experienciaId)
    .order("orden", { ascending: true });

  const { data: respuestas } = await supabase
    .from("respuestas_experiencia")
    .select("pregunta_id, respuesta")
    .eq("usuario_id", userId)
    .eq("experiencia_id", experienciaId);

  const respuestasPorPregunta = new Map((respuestas ?? []).map((r) => [r.pregunta_id, r.respuesta]));

  return {
    experiencia,
    preguntas: (preguntas ?? []).map((p) => ({
      ...p,
      respuestaActual: respuestasPorPregunta.get(p.id) ?? "",
    })),
  };
}

// Mi Proyecto: agrupa TODAS las respuestas por área, sin importar de qué
// experiencia vinieron — es la pieza que hace que futuras experiencias no
// necesiten código nuevo para aparecer acá.
export async function obtenerRespuestasPorArea(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("respuestas_experiencia")
    .select("area_respuesta, respuesta, creado_en, actualizado_en, preguntas_experiencia(texto)")
    .eq("usuario_id", userId)
    .order("actualizado_en", { ascending: true });

  const porArea = new Map<AreaRespuesta, { texto: string; respuesta: string; fecha: string }[]>();
  for (const fila of data ?? []) {
    const area = fila.area_respuesta as AreaRespuesta;
    const lista = porArea.get(area) ?? [];
    const preguntaRel = unoDeRelacion(fila.preguntas_experiencia as unknown as { texto: string } | { texto: string }[] | null);
    lista.push({
      texto: preguntaRel?.texto ?? "",
      respuesta: fila.respuesta,
      fecha: fila.actualizado_en,
    });
    porArea.set(area, lista);
  }
  return porArea;
}

export async function obtenerMovimientoActual(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("movimientos_semanales")
    .select("id, descripcion, estado, fecha_creado, sueno_id, proyecto_id")
    .eq("usuario_id", userId)
    .order("fecha_creado", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function obtenerEvidencias(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("evidencias")
    .select("id, contenido, fecha_creado, compartida_en_comunidad, movimiento_id")
    .eq("usuario_id", userId)
    .order("fecha_creado", { ascending: false });
  return data ?? [];
}

export async function obtenerProyectoActivo(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("proyectos_valentia")
    .select("id, sueno_id, fecha_inicio, etapa_actual, identidad_en_practica, estado")
    .eq("usuario_id", userId)
    .eq("estado", "activo")
    .maybeSingle();
  return data;
}

// Si la usuaria ya es premium pero todavía no tiene un Proyecto (recién
// convertida desde /admin), se lo crea la primera vez que entra a una
// pantalla que lo necesita. Usa el cliente de servidor con cookies de la
// propia usuaria: RLS exige nivel_actual()='premium' para el insert, así
// que si por lo que sea no lo es todavía, esto no hace nada (falla
// silenciosamente y la página sigue funcionando sin Proyecto).
export async function asegurarProyectoActivo(supabase: SupabaseClient, userId: string, suenoId: string | null) {
  const existente = await obtenerProyectoActivo(supabase, userId);
  if (existente) return existente;

  // Arranca en la primera etapa que ya tenga contenido publicado, para no
  // mandar a la usuaria a una etapa vacía mientras se carga el resto del
  // método desde /admin.
  const { data: etapaConContenido } = await supabase
    .from("experiencias")
    .select("etapa_id, etapas_ruta(orden)")
    .not("etapa_id", "is", null)
    .eq("estado", "publicado")
    .order("orden", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: nuevo, error } = await supabase
    .from("proyectos_valentia")
    .insert({
      usuario_id: userId,
      sueno_id: suenoId,
      etapa_actual: etapaConContenido?.etapa_id ?? null,
    })
    .select("id, sueno_id, fecha_inicio, etapa_actual, identidad_en_practica, estado")
    .maybeSingle();

  if (error) return null;
  return nuevo;
}

export async function estaCompletada(supabase: SupabaseClient, userId: string, experienciaId: string) {
  const { data } = await supabase
    .from("experiencias_completadas")
    .select("experiencia_id")
    .eq("usuario_id", userId)
    .eq("experiencia_id", experienciaId)
    .maybeSingle();
  return Boolean(data);
}

// Siguiente experiencia dentro del mismo grupo (recorrido de entrada, o
// misma etapa premium), respetando orden y accesibilidad — para el link
// "Siguiente" al terminar una experiencia.
export async function obtenerSiguienteExperiencia(
  supabase: SupabaseClient,
  etapaId: string | null,
  ordenActual: number
) {
  let query = supabase
    .from("experiencias")
    .select("id, titulo")
    .eq("estado", "publicado")
    .gt("orden", ordenActual)
    .order("orden", { ascending: true })
    .limit(1);
  query = etapaId ? query.eq("etapa_id", etapaId) : query.is("etapa_id", null);
  const { data } = await query.maybeSingle();
  return data;
}

export async function obtenerCategorias(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("categorias_comunidad")
    .select("id, nombre, orden, solo_premium, solo_admin_publica")
    .order("orden", { ascending: true });
  return data ?? [];
}

// `perfiles.id` y `publicaciones_comunidad.usuario_id` apuntan los dos a
// `auth.users(id)`, pero no hay una foreign key directa entre esas dos
// tablas — así que PostgREST NO puede embeber `perfiles(nombre)` en una
// query sobre publicaciones/comentarios (a diferencia de `categorias_comunidad`
// o `reacciones`/`comentarios`, que sí tienen FK directa). Por eso acá se
// resuelve con una segunda query batcheada y un merge en JS, en vez de
// embedding.
export async function mapaDeNombres(supabase: SupabaseClient, usuarioIds: string[]) {
  const idsUnicos = [...new Set(usuarioIds)];
  if (idsUnicos.length === 0) return new Map<string, string | null>();
  const { data } = await supabase.from("perfiles").select("id, nombre").in("id", idsUnicos);
  return new Map((data ?? []).map((p) => [p.id, p.nombre]));
}

export async function obtenerFeedComunidad(supabase: SupabaseClient, categoriaId?: string) {
  let query = supabase
    .from("publicaciones_comunidad")
    .select(
      "id, titulo, contenido, imagen_url, audio_url, fecha_creado, categoria_id, usuario_id, evidencia_id, movimiento_id, categorias_comunidad(nombre), reacciones(tipo, usuario_id), comentarios(id)"
    )
    // Los borradores de Meli (ver 0005_cms_admin.sql) solo se ven desde
    // /admin/comunidad — acá nunca deben aparecer.
    .eq("estado", "publicado")
    .order("fecha_creado", { ascending: false })
    .limit(50);
  if (categoriaId) query = query.eq("categoria_id", categoriaId);
  const { data } = await query;
  const posts = data ?? [];
  const nombres = await mapaDeNombres(supabase, posts.map((p) => p.usuario_id));
  return posts.map((p) => ({ ...p, perfiles: { nombre: nombres.get(p.usuario_id) ?? null } }));
}

// Para /admin/comunidad: todas las publicaciones de usuarias (todo lo que
// NO es de la categoría "Meli", que ya tiene su propia sección de
// administración). Corre con la sesión de quien está logueada en /admin
// (nunca service role), así que un editor la ve también — pero como
// `es_staff()` bypassea la policy de select, acá aparecen TODAS las
// publicaciones reales, incluidas las que una cuenta normal no vería por
// estar en una categoría solo-premium — no hace falta duplicar ese filtro.
export async function obtenerPublicacionesUsuariasAdmin(supabase: SupabaseClient) {
  const { data: categoriaMeli } = await supabase
    .from("categorias_comunidad")
    .select("id")
    .eq("nombre", "Meli")
    .maybeSingle();

  let query = supabase
    .from("publicaciones_comunidad")
    .select("id, contenido, fecha_creado, categoria_id, usuario_id, categorias_comunidad(nombre)")
    .order("fecha_creado", { ascending: false });
  if (categoriaMeli) query = query.neq("categoria_id", categoriaMeli.id);

  const { data } = await query;
  const posts = data ?? [];
  const nombres = await mapaDeNombres(supabase, posts.map((p) => p.usuario_id));
  return posts.map((p) => ({ ...p, nombreAutora: nombres.get(p.usuario_id) ?? "Alguien de la comunidad" }));
}

export async function obtenerPublicacionDetalle(supabase: SupabaseClient, publicacionId: string) {
  const { data } = await supabase
    .from("publicaciones_comunidad")
    .select(
      "id, titulo, contenido, imagen_url, audio_url, fecha_creado, categoria_id, usuario_id, categorias_comunidad(nombre), reacciones(tipo, usuario_id)"
    )
    .eq("id", publicacionId)
    .eq("estado", "publicado")
    .maybeSingle();
  if (!data) return null;
  const nombres = await mapaDeNombres(supabase, [data.usuario_id]);
  return { ...data, perfiles: { nombre: nombres.get(data.usuario_id) ?? null } };
}

export async function obtenerComentarios(supabase: SupabaseClient, publicacionId: string) {
  const { data } = await supabase
    .from("comentarios")
    .select("id, contenido, fecha_creado, usuario_id")
    .eq("publicacion_id", publicacionId)
    .order("fecha_creado", { ascending: true });
  const comentarios = data ?? [];
  const nombres = await mapaDeNombres(supabase, comentarios.map((c) => c.usuario_id));
  return comentarios.map((c) => ({ ...c, perfiles: { nombre: nombres.get(c.usuario_id) ?? null } }));
}

// ---------- Biblioteca ----------
// La estructura de datos ya existía completa desde 0005_cms_admin.sql
// (contenidos, cursos, modulos, contenido_ubicaciones) — acá solo se lee
// del lado de la alumna. `contenidos!inner(...)` hace que, si RLS no deja
// ver un contenido (Premium para una Gratis), la fila entera desaparece
// de la lista en vez de llegar con el contenido en null: así Biblioteca
// nunca muestra "algo" que en realidad no se puede abrir.

export async function obtenerBiblioteca(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("contenido_ubicaciones")
    .select(
      "id, nivel_acceso, orden, contenidos!inner(id, tipo, titulo, descripcion, contenido_html, portada_url, video_url, audio_url, archivo_url, duracion)"
    )
    .eq("contexto", "biblioteca")
    .order("orden", { ascending: true });

  type ContenidoBiblioteca = {
    id: string;
    tipo: string;
    titulo: string;
    descripcion: string | null;
    contenido_html: string | null;
    portada_url: string | null;
    video_url: string | null;
    audio_url: string | null;
    archivo_url: string | null;
    duracion: string | null;
  };

  return (data ?? [])
    .map((u) => ({
      ubicacionId: u.id as string,
      nivelAcceso: u.nivel_acceso as "gratis" | "membresia",
      contenido: unoDeRelacion(u.contenidos as unknown as ContenidoBiblioteca | ContenidoBiblioteca[] | null),
    }))
    .filter((u): u is typeof u & { contenido: NonNullable<(typeof u)["contenido"]> } => u.contenido !== null);
}

export async function obtenerContenido(supabase: SupabaseClient, contenidoId: string) {
  const { data } = await supabase
    .from("contenidos")
    .select("id, tipo, titulo, descripcion, contenido_html, portada_url, video_url, audio_url, archivo_url, duracion")
    .eq("id", contenidoId)
    .maybeSingle();
  return data;
}

// "Mini cursos gratuitos": mismos `cursos`/`modulos` que ya usa el CMS,
// filtrados a los que hoy son de acceso libre — el nombre de la sección
// en Biblioteca es literal, no hace falta una tabla nueva.
export async function obtenerCursosGratuitos(supabase: SupabaseClient) {
  const { data: cursos } = await supabase
    .from("cursos")
    .select("id, titulo, descripcion, orden")
    .eq("nivel_acceso", "gratis")
    .eq("estado", "publicado")
    .order("orden", { ascending: true });
  if (!cursos || cursos.length === 0) return [];

  const { data: modulos } = await supabase
    .from("modulos")
    .select("id, curso_id")
    .in("curso_id", cursos.map((c) => c.id));

  const conteoPorCurso = new Map<string, number>();
  (modulos ?? []).forEach((m) => conteoPorCurso.set(m.curso_id, (conteoPorCurso.get(m.curso_id) ?? 0) + 1));

  return cursos.map((c) => ({ ...c, cantidadModulos: conteoPorCurso.get(c.id) ?? 0 }));
}

export async function obtenerCursoConModulos(supabase: SupabaseClient, cursoId: string) {
  const { data: curso } = await supabase
    .from("cursos")
    .select("id, titulo, descripcion")
    .eq("id", cursoId)
    .maybeSingle();
  if (!curso) return null;

  const { data: modulos } = await supabase
    .from("modulos")
    .select("id, titulo, orden")
    .eq("curso_id", cursoId)
    .order("orden", { ascending: true });

  const moduloIds = (modulos ?? []).map((m) => m.id);
  type FilaUbicacion = { modulo_id: string; contenidos: { id: string; tipo: string; titulo: string; duracion: string | null } | { id: string; tipo: string; titulo: string; duracion: string | null }[] | null };
  let ubicaciones: FilaUbicacion[] = [];
  if (moduloIds.length > 0) {
    const { data } = await supabase
      .from("contenido_ubicaciones")
      .select("modulo_id, contenidos!inner(id, tipo, titulo, duracion)")
      .in("modulo_id", moduloIds)
      .order("orden", { ascending: true });
    ubicaciones = (data ?? []) as FilaUbicacion[];
  }

  const porModulo = new Map<string, FilaUbicacion[]>();
  ubicaciones.forEach((u) => {
    const lista = porModulo.get(u.modulo_id) ?? [];
    lista.push(u);
    porModulo.set(u.modulo_id, lista);
  });

  return {
    ...curso,
    modulos: (modulos ?? []).map((m) => ({
      ...m,
      contenidos: (porModulo.get(m.id) ?? [])
        .map((u) => unoDeRelacion(u.contenidos))
        .filter((c): c is NonNullable<typeof c> => c !== null),
    })),
  };
}

// ---------- Semanas en movimiento ----------
// Sin tabla nueva: se deriva de movimientos_semanales.estado = 'cumplido'
// (se llega a ese estado tanto marcando "realizado" como registrando una
// evidencia — ver lib/acciones/movimiento.ts). Una semana ISO con al menos
// un movimiento cumplido cuenta como "semana en movimiento". Nunca resta
// ni "rompe" nada: una semana sin movimiento simplemente no suma.
function claveSemanaIso(fechaIso: string): string {
  const original = new Date(fechaIso);
  const fecha = new Date(Date.UTC(original.getFullYear(), original.getMonth(), original.getDate()));
  const diaIso = fecha.getUTCDay() || 7;
  fecha.setUTCDate(fecha.getUTCDate() + 4 - diaIso);
  const inicioAno = new Date(Date.UTC(fecha.getUTCFullYear(), 0, 1));
  const numeroSemana = Math.ceil(((fecha.getTime() - inicioAno.getTime()) / 86400000 + 1) / 7);
  return `${fecha.getUTCFullYear()}-W${String(numeroSemana).padStart(2, "0")}`;
}

export async function obtenerSemanasEnMovimiento(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("movimientos_semanales")
    .select("fecha_creado")
    .eq("usuario_id", userId)
    .eq("estado", "cumplido");

  const movimientos = data ?? [];
  const semanas = new Set(movimientos.map((m) => claveSemanaIso(m.fecha_creado)));

  const ahora = new Date();
  const esteMes = movimientos.filter((m) => {
    const f = new Date(m.fecha_creado);
    return f.getFullYear() === ahora.getFullYear() && f.getMonth() === ahora.getMonth();
  }).length;

  return { total: semanas.size, esteMes };
}
