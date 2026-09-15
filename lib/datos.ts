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

// Recorrido de entrada: experiencias sin etapa (etapa_id is null), en orden.
export async function obtenerRecorridoEntrada(supabase: SupabaseClient, userId: string) {
  const { data: experiencias } = await supabase
    .from("experiencias")
    .select("id, titulo, descripcion, texto_intro, video_url, nivel_acceso, estado, orden")
    .is("etapa_id", null)
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
    .select("id, etapa_id, titulo, descripcion, video_url, nivel_acceso, estado, orden")
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
    .select("id, etapa_id, titulo, descripcion, texto_intro, video_url, nivel_acceso, estado, orden")
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
async function mapaDeNombres(supabase: SupabaseClient, usuarioIds: string[]) {
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
