"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";

export async function crearPublicacion(categoriaId: string, formData: FormData) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");

  const contenido = String(formData.get("contenido") ?? "").trim();
  if (!contenido) throw new Error("La publicación no puede estar vacía.");

  // RLS valida "Necesito destrabar" (solo premium) y "Meli" (solo staff)
  // en la base — acá no hace falta duplicar esa condición, solo dejar que
  // el insert falle si no corresponde.
  const { error } = await supabase.from("publicaciones_comunidad").insert({
    usuario_id: user.id,
    categoria_id: categoriaId,
    contenido,
  });
  if (error) throw error;

  revalidatePath("/comunidad");
}

export async function eliminarPublicacion(publicacionId: string) {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("publicaciones_comunidad").delete().eq("id", publicacionId);
  if (error) throw error;
  revalidatePath("/comunidad");
}

export async function comentar(publicacionId: string, formData: FormData) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");

  const contenido = String(formData.get("contenido") ?? "").trim();
  if (!contenido) throw new Error("El comentario no puede estar vacío.");

  const { error } = await supabase.from("comentarios").insert({
    usuario_id: user.id,
    publicacion_id: publicacionId,
    contenido,
  });
  if (error) throw error;

  revalidatePath("/comunidad");
}

const TIPOS_REACCION = ["corazon", "fuego", "aplauso"] as const;

// Reaccionar es un toggle por tipo: tocar ❤️ de nuevo saca la reacción
// propia, no acumula filas repetidas (además `reacciones` ya tiene un
// unique(publicacion_id, usuario_id, tipo) en la base).
export async function alternarReaccion(publicacionId: string, tipo: (typeof TIPOS_REACCION)[number]) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");

  const { data: existente } = await supabase
    .from("reacciones")
    .select("id")
    .eq("publicacion_id", publicacionId)
    .eq("usuario_id", user.id)
    .eq("tipo", tipo)
    .maybeSingle();

  if (existente) {
    await supabase.from("reacciones").delete().eq("id", existente.id);
  } else {
    const { error } = await supabase
      .from("reacciones")
      .insert({ publicacion_id: publicacionId, usuario_id: user.id, tipo });
    if (error) throw error;
  }

  revalidatePath("/comunidad");
}
