"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";

export async function crearSueno(formData: FormData) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");

  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const porQueImporta = String(formData.get("por_que_importa") ?? "").trim();
  if (!descripcion) throw new Error("El sueño no puede estar vacío.");

  // No hace falta chequear "¿ya tiene un sueño activo?" en el código: el
  // índice único parcial en `suenos` (usuario_id) where estado='activo'
  // (ver supabase/schema.sql) lo garantiza a nivel de base de datos.
  const { error } = await supabase.from("suenos").insert({
    usuario_id: user.id,
    descripcion,
    por_que_importa: porQueImporta,
    estado: "activo",
  });
  if (error) throw error;

  revalidatePath("/mi-sueno");
  revalidatePath("/inicio");
}

export async function crearMovimiento(suenoId: string, formData: FormData) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");

  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!descripcion) throw new Error("El movimiento no puede estar vacío.");

  const { error } = await supabase.from("movimientos_semanales").insert({
    usuario_id: user.id,
    sueno_id: suenoId,
    descripcion,
    estado: "planeado",
  });
  if (error) throw error;

  revalidatePath("/mi-sueno");
}

export async function crearEvidencia(
  suenoId: string,
  movimientoId: string | null,
  formData: FormData
) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");

  const contenido = String(formData.get("contenido") ?? "").trim();
  if (!contenido) throw new Error("La evidencia no puede estar vacía.");

  const { error } = await supabase.from("evidencias").insert({
    usuario_id: user.id,
    sueno_id: suenoId,
    movimiento_id: movimientoId,
    tipo: "texto",
    contenido,
  });
  if (error) throw error;

  if (movimientoId) {
    await supabase
      .from("movimientos_semanales")
      .update({ estado: "cumplido" })
      .eq("id", movimientoId);
  }

  revalidatePath("/mi-sueno");
}
