"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";

// El ritual semanal (lunes: elegir movimiento / viernes: registrar
// evidencia) trabaja siempre sobre "el movimiento más reciente sin
// evidencia". No hace falta un concepto explícito de "semana" para esta
// primera versión: una usuaria completa un movimiento, aparece el
// siguiente.
export async function guardarMovimiento(formData: FormData) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");

  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!descripcion) throw new Error("El movimiento no puede estar vacío.");

  const { data: sueno } = await supabase
    .from("suenos")
    .select("id")
    .eq("usuario_id", user.id)
    .eq("estado", "activo")
    .maybeSingle();

  const { data: pendiente } = await supabase
    .from("movimientos_semanales")
    .select("id")
    .eq("usuario_id", user.id)
    .eq("estado", "planeado")
    .order("fecha_creado", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendiente) {
    const { error } = await supabase
      .from("movimientos_semanales")
      .update({ descripcion })
      .eq("id", pendiente.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("movimientos_semanales").insert({
      usuario_id: user.id,
      sueno_id: sueno?.id ?? null,
      descripcion,
      estado: "planeado",
    });
    if (error) throw error;
  }

  revalidatePath("/movimiento");
  revalidatePath("/inicio");
  revalidatePath("/mi-proyecto");
}

export async function marcarMovimientoRealizado(movimientoId: string) {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("movimientos_semanales")
    .update({ estado: "cumplido" })
    .eq("id", movimientoId);
  if (error) throw error;
  revalidatePath("/movimiento");
  revalidatePath("/inicio");
}

export async function registrarEvidencia(movimientoId: string, formData: FormData) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");

  const contenido = String(formData.get("contenido") ?? "").trim();
  if (!contenido) throw new Error("La evidencia no puede estar vacía.");

  const { data: movimiento } = await supabase
    .from("movimientos_semanales")
    .select("sueno_id, proyecto_id")
    .eq("id", movimientoId)
    .maybeSingle();

  const { error } = await supabase.from("evidencias").insert({
    usuario_id: user.id,
    sueno_id: movimiento?.sueno_id ?? null,
    proyecto_id: movimiento?.proyecto_id ?? null,
    movimiento_id: movimientoId,
    tipo: "texto",
    contenido,
  });
  if (error) throw error;

  await supabase.from("movimientos_semanales").update({ estado: "cumplido" }).eq("id", movimientoId);

  revalidatePath("/movimiento");
  revalidatePath("/inicio");
  revalidatePath("/mi-proyecto");
}

// Compartir una evidencia es un toggle: se puede "descompartir" borrando la
// publicación que la mostró en Comunidad. Nunca se comparten las
// respuestas de experiencias, solo el texto de la evidencia — igual que en
// el diseño ("Solo se comparte la evidencia, nunca tus respuestas.").
export async function alternarCompartirEvidencia(evidenciaId: string) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");

  const { data: evidencia } = await supabase
    .from("evidencias")
    .select("id, contenido, compartida_en_comunidad")
    .eq("id", evidenciaId)
    .maybeSingle();
  if (!evidencia) throw new Error("Evidencia no encontrada.");

  if (evidencia.compartida_en_comunidad) {
    await supabase
      .from("publicaciones_comunidad")
      .delete()
      .eq("usuario_id", user.id)
      .eq("evidencia_id", evidenciaId);
    await supabase.from("evidencias").update({ compartida_en_comunidad: false }).eq("id", evidenciaId);
  } else {
    const { data: categoria } = await supabase
      .from("categorias_comunidad")
      .select("id")
      .eq("nombre", "Evidencias")
      .maybeSingle();
    if (!categoria) throw new Error("Falta la categoría Evidencias.");

    await supabase.from("publicaciones_comunidad").insert({
      usuario_id: user.id,
      categoria_id: categoria.id,
      contenido: evidencia.contenido ?? "",
      evidencia_id: evidenciaId,
    });
    await supabase.from("evidencias").update({ compartida_en_comunidad: true }).eq("id", evidenciaId);
  }

  revalidatePath("/movimiento");
  revalidatePath("/mi-proyecto");
  revalidatePath("/comunidad");
}

export async function compartirMovimientoEnComunidad(movimientoId: string, descripcion: string) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");

  const { data: categoria } = await supabase
    .from("categorias_comunidad")
    .select("id")
    .eq("nombre", "Movimientos")
    .maybeSingle();
  if (!categoria) throw new Error("Falta la categoría Movimientos.");

  const { error } = await supabase.from("publicaciones_comunidad").insert({
    usuario_id: user.id,
    categoria_id: categoria.id,
    contenido: descripcion,
    movimiento_id: movimientoId,
  });
  if (error) throw error;

  revalidatePath("/movimiento");
  revalidatePath("/comunidad");
}
