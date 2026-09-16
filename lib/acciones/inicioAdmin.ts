"use server";

import { revalidatePath } from "next/cache";
import { exigirStaff } from "@/lib/autorizacion";

export async function guardarConfiguracionHome(formData: FormData) {
  const { supabase } = await exigirStaff();

  const datos = {
    id: "home",
    eyebrow: String(formData.get("eyebrow") ?? "").trim() || null,
    titulo: String(formData.get("titulo") ?? "").trim() || null,
    bajada: String(formData.get("bajada") ?? "").trim() || null,
    imagen_url: String(formData.get("imagen_url") ?? "").trim() || null,
    actualizado_en: new Date().toISOString(),
  };

  const { error } = await supabase.from("configuracion_home").upsert(datos, { onConflict: "id" });
  if (error) throw error;

  revalidatePath("/admin/inicio");
  revalidatePath("/inicio");
}
