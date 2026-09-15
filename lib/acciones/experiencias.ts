"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";

// Guarda todas las respuestas de una experiencia de una sola vez (la
// página manda un input por pregunta, nombrado `pregunta_<id>`). Es
// genérico a propósito: no sabe nada de "Mi Sueño" ni de "identidad", solo
// upsertea respuestas — el área de cada una la fija el trigger de la base
// a partir de la pregunta, así que agregar una experiencia nueva desde
// /admin nunca requiere tocar esta función.
export async function guardarRespuestas(experienciaId: string, formData: FormData) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");

  const filas: { usuario_id: string; pregunta_id: string; respuesta: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("pregunta_")) continue;
    const respuesta = String(value ?? "").trim();
    if (!respuesta) continue;
    filas.push({ usuario_id: user.id, pregunta_id: key.slice("pregunta_".length), respuesta });
  }

  if (filas.length > 0) {
    const { error } = await supabase
      .from("respuestas_experiencia")
      .upsert(filas, { onConflict: "usuario_id,pregunta_id" });
    if (error) throw error;
  }

  // Efectos de las áreas que alimentan tablas ya existentes (sueño,
  // movimiento semanal), además de quedar guardadas como respuesta.
  const { data: guardadas } = await supabase
    .from("respuestas_experiencia")
    .select("area_respuesta, respuesta")
    .eq("usuario_id", user.id)
    .eq("experiencia_id", experienciaId);

  const porArea = new Map((guardadas ?? []).map((g) => [g.area_respuesta, g.respuesta]));

  let suenoId: string | null = null;
  const descripcionSueno = porArea.get("sueno");
  if (descripcionSueno) {
    const { data: activo } = await supabase
      .from("suenos")
      .select("id")
      .eq("usuario_id", user.id)
      .eq("estado", "activo")
      .maybeSingle();

    if (activo) {
      await supabase.from("suenos").update({ descripcion: descripcionSueno }).eq("id", activo.id);
      suenoId = activo.id;
    } else {
      const { data: creado } = await supabase
        .from("suenos")
        .insert({ usuario_id: user.id, descripcion: descripcionSueno })
        .select("id")
        .maybeSingle();
      suenoId = creado?.id ?? null;
    }
  }

  const porQueImporta = porArea.get("para_que");
  if (porQueImporta) {
    if (!suenoId) {
      const { data: activo } = await supabase
        .from("suenos")
        .select("id")
        .eq("usuario_id", user.id)
        .eq("estado", "activo")
        .maybeSingle();
      suenoId = activo?.id ?? null;
    }
    if (suenoId) {
      await supabase.from("suenos").update({ por_que_importa: porQueImporta }).eq("id", suenoId);
    }
  }

  const primerMovimiento = porArea.get("movimiento");
  if (primerMovimiento) {
    if (!suenoId) {
      const { data: activo } = await supabase
        .from("suenos")
        .select("id")
        .eq("usuario_id", user.id)
        .eq("estado", "activo")
        .maybeSingle();
      suenoId = activo?.id ?? null;
    }

    const { data: pendiente } = await supabase
      .from("movimientos_semanales")
      .select("id")
      .eq("usuario_id", user.id)
      .eq("estado", "planeado")
      .order("fecha_creado", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendiente) {
      await supabase.from("movimientos_semanales").update({ descripcion: primerMovimiento }).eq("id", pendiente.id);
    } else {
      await supabase
        .from("movimientos_semanales")
        .insert({ usuario_id: user.id, sueno_id: suenoId, descripcion: primerMovimiento, estado: "planeado" });
    }
  }

  // Completa la experiencia solo si TODAS sus preguntas tienen respuesta —
  // igual que el gating de "Siguiente"/"Guardar" en el diseño.
  const { count: totalPreguntas } = await supabase
    .from("preguntas_experiencia")
    .select("id", { count: "exact", head: true })
    .eq("experiencia_id", experienciaId);

  const { count: totalRespuestas } = await supabase
    .from("respuestas_experiencia")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", user.id)
    .eq("experiencia_id", experienciaId);

  if (totalPreguntas !== null && totalRespuestas !== null && totalPreguntas > 0 && totalRespuestas >= totalPreguntas) {
    await supabase
      .from("experiencias_completadas")
      .upsert({ usuario_id: user.id, experiencia_id: experienciaId }, { onConflict: "usuario_id,experiencia_id" });
  }

  revalidatePath("/mi-sueno");
  revalidatePath("/inicio");
  revalidatePath("/mi-proyecto");
  revalidatePath("/movimiento");
  revalidatePath(`/experiencias/${experienciaId}`);
}
