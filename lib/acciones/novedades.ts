"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirStaff } from "@/lib/autorizacion";
import { ESTADOS_CMS, NIVELES_ACCESO, TIPOS_NOVEDAD } from "@/lib/tipos";

export async function guardarNovedad(novedadId: string | null, formData: FormData) {
  const { supabase } = await exigirStaff();

  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) throw new Error("El título es obligatorio.");
  const href = String(formData.get("href") ?? "").trim();
  if (!href) throw new Error("El destino (href) es obligatorio.");
  const tipo = String(formData.get("tipo") ?? "contenido");
  if (!TIPOS_NOVEDAD.includes(tipo as (typeof TIPOS_NOVEDAD)[number])) throw new Error("Tipo inválido.");
  const nivelAcceso = String(formData.get("nivel_acceso") ?? "gratis");
  if (!NIVELES_ACCESO.includes(nivelAcceso as (typeof NIVELES_ACCESO)[number])) throw new Error("Acceso inválido.");
  const estado = String(formData.get("estado") ?? "borrador");
  if (!ESTADOS_CMS.includes(estado as (typeof ESTADOS_CMS)[number])) throw new Error("Estado inválido.");
  const publicadoDesde = String(formData.get("publicado_desde") ?? "").trim();
  const publicadoHasta = String(formData.get("publicado_hasta") ?? "").trim();

  const datos = {
    titulo,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    tipo,
    imagen_url: String(formData.get("imagen_url") ?? "").trim() || null,
    href,
    nivel_acceso: nivelAcceso,
    estado,
    destacado: formData.get("destacado") === "on",
    publicado_desde: publicadoDesde ? new Date(publicadoDesde).toISOString() : new Date().toISOString(),
    publicado_hasta: publicadoHasta ? new Date(publicadoHasta).toISOString() : null,
  };

  if (novedadId) {
    const { error } = await supabase.from("novedades_inicio").update(datos).eq("id", novedadId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("novedades_inicio").insert(datos);
    if (error) throw error;
  }

  revalidatePath("/admin/novedades");
  revalidatePath("/inicio");
  redirect("/admin/novedades");
}

export async function cambiarEstadoNovedad(novedadId: string, estado: string) {
  const { supabase } = await exigirStaff();
  if (!ESTADOS_CMS.includes(estado as (typeof ESTADOS_CMS)[number])) throw new Error("Estado inválido.");
  const { error } = await supabase.from("novedades_inicio").update({ estado }).eq("id", novedadId);
  if (error) throw error;
  revalidatePath("/admin/novedades");
  revalidatePath("/inicio");
}
