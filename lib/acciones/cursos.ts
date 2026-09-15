"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirStaff } from "@/lib/autorizacion";
import { ESTADOS_CMS, NIVELES_ACCESO } from "@/lib/tipos";

export async function guardarCurso(cursoId: string | null, formData: FormData) {
  const { supabase } = await exigirStaff();

  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) throw new Error("El título es obligatorio.");
  const nivelAcceso = String(formData.get("nivel_acceso") ?? "gratis");
  if (!NIVELES_ACCESO.includes(nivelAcceso as (typeof NIVELES_ACCESO)[number])) {
    throw new Error("Nivel de acceso inválido.");
  }
  const estado = String(formData.get("estado") ?? "borrador");
  if (!ESTADOS_CMS.includes(estado as (typeof ESTADOS_CMS)[number])) throw new Error("Estado inválido.");

  const datos = {
    titulo,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    nivel_acceso: nivelAcceso,
    estado,
    orden: Number(formData.get("orden") ?? 0),
  };

  let id = cursoId;
  if (id) {
    const { error } = await supabase.from("cursos").update(datos).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("cursos").insert(datos).select("id").single();
    if (error) throw error;
    id = data.id;
  }

  revalidatePath("/admin/cursos");
  redirect(`/admin/cursos/${id}`);
}

export async function cambiarEstadoCurso(cursoId: string, estado: string) {
  const { supabase } = await exigirStaff();
  if (!ESTADOS_CMS.includes(estado as (typeof ESTADOS_CMS)[number])) throw new Error("Estado inválido.");
  const { error } = await supabase.from("cursos").update({ estado }).eq("id", cursoId);
  if (error) throw error;
  revalidatePath("/admin/cursos");
  revalidatePath(`/admin/cursos/${cursoId}`);
}

export async function crearModulo(cursoId: string, formData: FormData) {
  const { supabase } = await exigirStaff();
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) throw new Error("El título del módulo es obligatorio.");

  const { data: existentes } = await supabase
    .from("modulos")
    .select("orden")
    .eq("curso_id", cursoId)
    .order("orden", { ascending: false })
    .limit(1);
  const siguienteOrden = (existentes?.[0]?.orden ?? 0) + 1;

  const { error } = await supabase.from("modulos").insert({ curso_id: cursoId, titulo, orden: siguienteOrden });
  if (error) throw error;
  revalidatePath(`/admin/cursos/${cursoId}`);
}

export async function renombrarModulo(moduloId: string, cursoId: string, formData: FormData) {
  const { supabase } = await exigirStaff();
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) throw new Error("El título del módulo es obligatorio.");
  const orden = Number(formData.get("orden") ?? 0);
  const { error } = await supabase.from("modulos").update({ titulo, orden }).eq("id", moduloId);
  if (error) throw error;
  revalidatePath(`/admin/cursos/${cursoId}`);
}

// El botón para esto solo se muestra en la pantalla cuando el módulo ya no
// tiene ningún contenido — así nunca se intenta borrar uno que la base
// rechazaría igual (contenido_ubicaciones.modulo_id no tiene cascada).
export async function eliminarModulo(moduloId: string, cursoId: string) {
  const { supabase } = await exigirStaff();
  const { error } = await supabase.from("modulos").delete().eq("id", moduloId);
  if (error) throw error;
  revalidatePath(`/admin/cursos/${cursoId}`);
}
