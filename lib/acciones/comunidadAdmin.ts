"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirStaff } from "@/lib/autorizacion";

async function idCategoriaMeli(supabase: Awaited<ReturnType<typeof exigirStaff>>["supabase"]) {
  const { data } = await supabase.from("categorias_comunidad").select("id").eq("nombre", "Meli").maybeSingle();
  if (!data) throw new Error("Falta la categoría Meli en categorias_comunidad.");
  return data.id;
}

export async function guardarPublicacionMeli(publicacionId: string | null, formData: FormData) {
  const { supabase, user } = await exigirStaff();

  const contenido = String(formData.get("contenido") ?? "").trim();
  if (!contenido) throw new Error("Escribí algo antes de guardar.");
  const estado = String(formData.get("estado") ?? "borrador");
  if (!["borrador", "publicado"].includes(estado)) throw new Error("Estado inválido.");

  const datos = {
    titulo: String(formData.get("titulo") ?? "").trim() || null,
    contenido,
    imagen_url: String(formData.get("imagen_url") ?? "").trim() || null,
    audio_url: String(formData.get("audio_url") ?? "").trim() || null,
    estado,
  };

  if (publicacionId) {
    const { error } = await supabase.from("publicaciones_comunidad").update(datos).eq("id", publicacionId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("publicaciones_comunidad").insert({
      ...datos,
      usuario_id: user.id,
      categoria_id: await idCategoriaMeli(supabase),
    });
    if (error) throw error;
  }

  revalidatePath("/admin/comunidad");
  revalidatePath("/comunidad");
  redirect("/admin/comunidad");
}

export async function eliminarPublicacionMeli(publicacionId: string) {
  const { supabase } = await exigirStaff();
  const { error } = await supabase.from("publicaciones_comunidad").delete().eq("id", publicacionId);
  if (error) throw error;
  revalidatePath("/admin/comunidad");
  revalidatePath("/comunidad");
}
