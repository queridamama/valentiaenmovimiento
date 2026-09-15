"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirStaff } from "@/lib/autorizacion";
import { ESTADOS_CMS, NIVELES_ACCESO } from "@/lib/tipos";

const TIPOS_EVENTO = ["taller_mensual", "laboratorio_movimiento"] as const;

export async function guardarEvento(eventoId: string | null, formData: FormData) {
  const { supabase } = await exigirStaff();

  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) throw new Error("El título es obligatorio.");
  const tipo = String(formData.get("tipo") ?? "");
  if (!TIPOS_EVENTO.includes(tipo as (typeof TIPOS_EVENTO)[number])) throw new Error("Tipo de evento inválido.");
  const fechaHora = String(formData.get("fecha_hora") ?? "");
  if (!fechaHora) throw new Error("La fecha y hora son obligatorias.");
  const nivelAcceso = String(formData.get("nivel_acceso") ?? "membresia");
  if (!NIVELES_ACCESO.includes(nivelAcceso as (typeof NIVELES_ACCESO)[number])) throw new Error("Acceso inválido.");
  const estado = String(formData.get("estado") ?? "borrador");
  if (!ESTADOS_CMS.includes(estado as (typeof ESTADOS_CMS)[number])) throw new Error("Estado inválido.");

  const datos = {
    tipo,
    titulo,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    portada_url: String(formData.get("portada_url") ?? "").trim() || null,
    fecha_hora: new Date(fechaHora).toISOString(),
    link_externo: String(formData.get("link_externo") ?? "").trim() || null,
    contenido_grabacion_id: String(formData.get("contenido_grabacion_id") ?? "").trim() || null,
    nivel_acceso: nivelAcceso,
    estado,
  };

  if (eventoId) {
    const { error } = await supabase.from("eventos").update(datos).eq("id", eventoId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("eventos").insert(datos);
    if (error) throw error;
  }

  revalidatePath("/admin/eventos");
  redirect("/admin/eventos");
}

export async function cambiarEstadoEvento(eventoId: string, estado: string) {
  const { supabase } = await exigirStaff();
  if (!ESTADOS_CMS.includes(estado as (typeof ESTADOS_CMS)[number])) throw new Error("Estado inválido.");
  const { error } = await supabase.from("eventos").update({ estado }).eq("id", eventoId);
  if (error) throw error;
  revalidatePath("/admin/eventos");
}
