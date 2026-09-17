"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirStaff } from "@/lib/autorizacion";
import { AREAS_RESPUESTA, ESTADOS_EXPERIENCIA, NIVELES_ACCESO, TIPOS_EXPERIENCIA, type AreaRespuesta } from "@/lib/tipos";

interface PreguntaForm {
  id?: string;
  texto: string;
  placeholder?: string;
  area_respuesta: AreaRespuesta;
  orden: number;
}

function parsearPreguntas(json: string): PreguntaForm[] {
  let filas: unknown;
  try {
    filas = JSON.parse(json);
  } catch {
    throw new Error("Preguntas mal formadas.");
  }
  if (!Array.isArray(filas)) throw new Error("Preguntas mal formadas.");

  return filas.map((fila, i) => {
    const f = fila as Record<string, unknown>;
    const texto = String(f.texto ?? "").trim();
    if (!texto) throw new Error(`La pregunta ${i + 1} no puede estar vacía.`);
    const area = String(f.area_respuesta ?? "libre");
    if (!AREAS_RESPUESTA.includes(area as AreaRespuesta)) {
      throw new Error(`Área inválida en la pregunta ${i + 1}.`);
    }
    return {
      id: typeof f.id === "string" && f.id ? f.id : undefined,
      texto,
      placeholder: f.placeholder ? String(f.placeholder) : undefined,
      area_respuesta: area as AreaRespuesta,
      orden: Number(f.orden ?? i + 1),
    };
  });
}

// Crea o actualiza una experiencia + su set completo de preguntas. Las
// preguntas que ya tenían id se actualizan en su lugar (no se les cambia el
// id) para no perder las respuestas ya guardadas de alumnas; las que
// llegan sin id son nuevas; las que existían en la base pero no vinieron
// en este guardado se consideran borradas por la editora y se eliminan
// (con sus respuestas, por el ON DELETE CASCADE del esquema).
export async function guardarExperiencia(experienciaId: string | null, formData: FormData) {
  const { supabase, user } = await exigirStaff();

  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) throw new Error("El título es obligatorio.");
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const textoIntro = String(formData.get("texto_intro") ?? "").trim() || null;
  const videoUrl = String(formData.get("video_url") ?? "").trim() || null;
  const audioUrl = String(formData.get("audio_url") ?? "").trim() || null;
  const duracion = String(formData.get("duracion") ?? "").trim() || null;
  const tipo = String(formData.get("tipo") ?? "clase");
  const portadaUrl = String(formData.get("portada_url") ?? "").trim() || null;
  const etapaId = String(formData.get("etapa_id") ?? "").trim() || null;
  const moduloId = String(formData.get("modulo_id") ?? "").trim() || null;
  const nivelAcceso = String(formData.get("nivel_acceso") ?? "gratis");
  const estado = String(formData.get("estado") ?? "borrador");
  const orden = Number(formData.get("orden") ?? 0);

  if (!NIVELES_ACCESO.includes(nivelAcceso as (typeof NIVELES_ACCESO)[number])) {
    throw new Error("Nivel de acceso inválido.");
  }
  if (!ESTADOS_EXPERIENCIA.includes(estado as (typeof ESTADOS_EXPERIENCIA)[number])) {
    throw new Error("Estado inválido.");
  }
  if (!TIPOS_EXPERIENCIA.includes(tipo as (typeof TIPOS_EXPERIENCIA)[number])) {
    throw new Error("Tipo de experiencia inválido.");
  }

  const preguntas = parsearPreguntas(String(formData.get("preguntas_json") ?? "[]"));

  const datosExperiencia = {
    titulo,
    descripcion,
    texto_intro: textoIntro,
    video_url: videoUrl,
    audio_url: audioUrl,
    duracion,
    tipo,
    portada_url: portadaUrl,
    etapa_id: etapaId,
    modulo_id: moduloId,
    nivel_acceso: nivelAcceso,
    estado,
    orden,
    actualizado_en: new Date().toISOString(),
  };

  let id = experienciaId;
  if (id) {
    const { error } = await supabase.from("experiencias").update(datosExperiencia).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("experiencias")
      .insert({ ...datosExperiencia, creado_por: user.id })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
  }

  const { data: existentes } = await supabase
    .from("preguntas_experiencia")
    .select("id")
    .eq("experiencia_id", id);
  const idsExistentes = new Set((existentes ?? []).map((p) => p.id));
  const idsEnviados = new Set(preguntas.filter((p) => p.id).map((p) => p.id));

  const aBorrar = [...idsExistentes].filter((existenteId) => !idsEnviados.has(existenteId));
  if (aBorrar.length > 0) {
    await supabase.from("preguntas_experiencia").delete().in("id", aBorrar);
  }

  for (const p of preguntas) {
    if (p.id) {
      await supabase
        .from("preguntas_experiencia")
        .update({ texto: p.texto, placeholder: p.placeholder ?? null, area_respuesta: p.area_respuesta, orden: p.orden })
        .eq("id", p.id);
    } else {
      await supabase.from("preguntas_experiencia").insert({
        experiencia_id: id,
        texto: p.texto,
        placeholder: p.placeholder ?? null,
        area_respuesta: p.area_respuesta,
        orden: p.orden,
      });
    }
  }

  revalidatePath("/admin/experiencias");
  revalidatePath("/mi-sueno");
  revalidatePath("/inicio");
  redirect("/admin/experiencias");
}

export async function duplicarExperiencia(experienciaId: string) {
  const { supabase, user } = await exigirStaff();

  const { data: original } = await supabase
    .from("experiencias")
    .select("*")
    .eq("id", experienciaId)
    .maybeSingle();
  if (!original) throw new Error("Experiencia no encontrada.");

  const { data: copia, error } = await supabase
    .from("experiencias")
    .insert({
      etapa_id: original.etapa_id,
      modulo_id: original.modulo_id,
      titulo: `${original.titulo} (copia)`,
      descripcion: original.descripcion,
      texto_intro: original.texto_intro,
      video_url: original.video_url,
      audio_url: original.audio_url,
      duracion: original.duracion,
      tipo: original.tipo,
      portada_url: original.portada_url,
      nivel_acceso: original.nivel_acceso,
      estado: "borrador",
      orden: original.orden,
      // wp_post_id NUNCA se copia: es unique, y la copia no viene de
      // WordPress — nace suelta, igual que ya hace duplicarContenido.
      creado_por: user.id,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { data: preguntas } = await supabase
    .from("preguntas_experiencia")
    .select("texto, placeholder, area_respuesta, orden")
    .eq("experiencia_id", experienciaId);

  if (preguntas && preguntas.length > 0) {
    await supabase
      .from("preguntas_experiencia")
      .insert(preguntas.map((p) => ({ ...p, experiencia_id: copia.id })));
  }

  revalidatePath("/admin/experiencias");
}

export async function cambiarEstadoExperiencia(experienciaId: string, estado: string) {
  const { supabase } = await exigirStaff();
  if (!ESTADOS_EXPERIENCIA.includes(estado as (typeof ESTADOS_EXPERIENCIA)[number])) {
    throw new Error("Estado inválido.");
  }
  const { error } = await supabase.from("experiencias").update({ estado }).eq("id", experienciaId);
  if (error) throw error;
  revalidatePath("/admin/experiencias");
  revalidatePath("/mi-sueno");
  revalidatePath("/inicio");
}

export async function cambiarAccesoExperiencia(experienciaId: string, nivelAcceso: string) {
  const { supabase } = await exigirStaff();
  if (!NIVELES_ACCESO.includes(nivelAcceso as (typeof NIVELES_ACCESO)[number])) {
    throw new Error("Nivel de acceso inválido.");
  }
  const { error } = await supabase.from("experiencias").update({ nivel_acceso: nivelAcceso }).eq("id", experienciaId);
  if (error) throw error;
  revalidatePath("/admin/experiencias");
}

// Conversión manual de nivel (cortesías, pruebas, alumnas históricas,
// soporte): SOLO admin — la policy `autorizaciones_update_admin` en
// supabase/schema.sql ya lo exige a nivel de base, esto además evita que
// un editor vea la opción. Siempre marca origen_nivel='manual', incluso
// si la usuaria tenía Premium por Mercado Pago: el admin tiene la última
// palabra, y esto además evita que un webhook posterior de una
// suscripción vieja/inconsistente le vuelva a tocar el nivel por error
// (ver lib/suscripciones.ts, que nunca toca un origen_nivel='manual').
export async function cambiarNivelUsuaria(usuarioId: string, nivel: "gratis" | "premium") {
  const { supabase, rol } = await exigirStaff();
  if (rol !== "admin") throw new Error("Solo un admin puede cambiar el nivel de una usuaria.");

  const { error } = await supabase
    .from("autorizaciones")
    .update({ nivel, origen_nivel: "manual" })
    .eq("usuario_id", usuarioId);
  if (error) throw error;

  revalidatePath("/admin/usuarias");
}

export async function cambiarRolUsuaria(usuarioId: string, rol: "miembro" | "editor" | "admin") {
  const { supabase, rol: rolActual } = await exigirStaff();
  if (rolActual !== "admin") throw new Error("Solo un admin puede cambiar el rol de una usuaria.");

  const { error } = await supabase.from("autorizaciones").update({ rol }).eq("usuario_id", usuarioId);
  if (error) throw error;

  revalidatePath("/admin/usuarias");
}
