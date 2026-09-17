"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirStaff } from "@/lib/autorizacion";
import { ESTADOS_CMS } from "@/lib/tipos";

export async function guardarModulo(moduloId: string | null, formData: FormData) {
  const { supabase } = await exigirStaff();

  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) throw new Error("El título es obligatorio.");
  const etapaId = String(formData.get("etapa_id") ?? "").trim();
  if (!etapaId) throw new Error("La etapa es obligatoria.");
  const estado = String(formData.get("estado") ?? "borrador");
  if (!ESTADOS_CMS.includes(estado as (typeof ESTADOS_CMS)[number])) throw new Error("Estado inválido.");

  const datos = {
    etapa_id: etapaId,
    titulo,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    orden: Number(formData.get("orden") ?? 0),
    estado,
    actualizado_en: new Date().toISOString(),
  };

  if (moduloId) {
    const { error } = await supabase.from("modulos_ruta").update(datos).eq("id", moduloId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("modulos_ruta").insert(datos);
    if (error) throw error;
  }

  revalidatePath("/admin/modulos");
  revalidatePath("/mi-sueno");
  revalidatePath("/inicio");
  redirect("/admin/modulos");
}

export async function cambiarEstadoModulo(moduloId: string, estado: string) {
  const { supabase } = await exigirStaff();
  if (!ESTADOS_CMS.includes(estado as (typeof ESTADOS_CMS)[number])) throw new Error("Estado inválido.");
  const { error } = await supabase.from("modulos_ruta").update({ estado }).eq("id", moduloId);
  if (error) throw error;
  revalidatePath("/admin/modulos");
  revalidatePath("/mi-sueno");
  revalidatePath("/inicio");
}
