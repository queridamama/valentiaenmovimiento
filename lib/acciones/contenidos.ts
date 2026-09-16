"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirStaff } from "@/lib/autorizacion";
import { ESTADOS_CMS, NIVELES_ACCESO, TIPOS_CONTENIDO } from "@/lib/tipos";

// El acceso (Gratis/Premium) de un contenido no vive en el contenido en
// sí, sino en CADA lugar donde aparece (contenido_ubicaciones) — así lo
// audita supabase/schema.sql (contenido_accesible()): una etapa siempre es
// Premium, un módulo hereda el acceso del curso, y solo "suelto en
// Biblioteca" tiene su propio Gratis/Premium. Se respeta ese modelo en vez
// de agregar una columna nueva que podría contradecirlo.
export async function guardarContenido(contenidoId: string | null, formData: FormData) {
  const { supabase, user } = await exigirStaff();

  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) throw new Error("El título es obligatorio.");
  const tipo = String(formData.get("tipo") ?? "");
  if (!TIPOS_CONTENIDO.includes(tipo as (typeof TIPOS_CONTENIDO)[number])) {
    throw new Error("Tipo de contenido inválido.");
  }
  const estado = String(formData.get("estado") ?? "borrador");
  if (!ESTADOS_CMS.includes(estado as (typeof ESTADOS_CMS)[number])) {
    throw new Error("Estado inválido.");
  }

  const datos = {
    titulo,
    tipo,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    contenido_html: String(formData.get("contenido_html") ?? "").trim() || null,
    portada_url: String(formData.get("portada_url") ?? "").trim() || null,
    video_url: String(formData.get("video_url") ?? "").trim() || null,
    audio_url: String(formData.get("audio_url") ?? "").trim() || null,
    archivo_url: String(formData.get("archivo_url") ?? "").trim() || null,
    duracion: String(formData.get("duracion") ?? "").trim() || null,
    estado,
    actualizado_en: new Date().toISOString(),
  };

  let id = contenidoId;
  if (id) {
    const { error } = await supabase.from("contenidos").update(datos).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("contenidos")
      .insert({ ...datos, creado_por: user.id })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
  }

  revalidatePath("/admin/biblioteca");
  redirect(`/admin/biblioteca/${id}`);
}

export async function duplicarContenido(contenidoId: string) {
  const { supabase, user } = await exigirStaff();

  const { data: original } = await supabase.from("contenidos").select("*").eq("id", contenidoId).maybeSingle();
  if (!original) throw new Error("Contenido no encontrado.");

  const { error } = await supabase.from("contenidos").insert({
    tipo: original.tipo,
    titulo: `${original.titulo} (copia)`,
    descripcion: original.descripcion,
    contenido_html: original.contenido_html,
    portada_url: original.portada_url,
    video_url: original.video_url,
    audio_url: original.audio_url,
    archivo_url: original.archivo_url,
    duracion: original.duracion,
    estado: "borrador",
    creado_por: user.id,
  });
  if (error) throw error;

  // A propósito NO se copian las ubicaciones: la copia nace suelta (sin
  // aparecer en ningún lado) hasta que la editora decida dónde ponerla, así
  // nunca queda un duplicado publicado por accidente en el mismo curso.
  revalidatePath("/admin/biblioteca");
}

export async function cambiarEstadoContenido(contenidoId: string, estado: string) {
  const { supabase } = await exigirStaff();
  if (!ESTADOS_CMS.includes(estado as (typeof ESTADOS_CMS)[number])) throw new Error("Estado inválido.");
  const { error } = await supabase.from("contenidos").update({ estado }).eq("id", contenidoId);
  if (error) throw error;
  revalidatePath("/admin/biblioteca");
  revalidatePath(`/admin/biblioteca/${contenidoId}`);
}

// ---------- Ubicaciones: dónde aparece cada contenido ----------

export async function agregarUbicacionBiblioteca(contenidoId: string, formData: FormData) {
  const { supabase } = await exigirStaff();
  const nivelAcceso = String(formData.get("nivelAcceso") ?? "");
  if (!NIVELES_ACCESO.includes(nivelAcceso as (typeof NIVELES_ACCESO)[number])) {
    throw new Error("Nivel de acceso inválido.");
  }
  const { error } = await supabase.from("contenido_ubicaciones").insert({
    contenido_id: contenidoId,
    contexto: "biblioteca",
    nivel_acceso: nivelAcceso,
  });
  if (error) throw error;
  revalidatePath(`/admin/biblioteca/${contenidoId}`);
}

export async function agregarUbicacionEtapa(contenidoId: string, formData: FormData) {
  const { supabase } = await exigirStaff();
  const etapaId = String(formData.get("etapaId") ?? "");
  if (!etapaId) throw new Error("Elegí una etapa.");
  const { error } = await supabase.from("contenido_ubicaciones").insert({
    contenido_id: contenidoId,
    contexto: "etapa",
    etapa_id: etapaId,
  });
  if (error) throw error;
  revalidatePath(`/admin/biblioteca/${contenidoId}`);
}

// Usada desde dos lugares (la propia página del contenido, y la de un
// módulo de curso) donde cada uno fija un id distinto y deja elegir el
// otro — por eso ninguno de los dos va atado con bind, los dos viajan en
// el formData.
export async function agregarUbicacionModulo(formData: FormData) {
  const { supabase } = await exigirStaff();
  const contenidoId = String(formData.get("contenidoId") ?? "");
  const moduloId = String(formData.get("moduloId") ?? "");
  if (!contenidoId) throw new Error("Falta el contenido.");
  if (!moduloId) throw new Error("Elegí un módulo.");

  const { data: existentes } = await supabase
    .from("contenido_ubicaciones")
    .select("orden")
    .eq("modulo_id", moduloId)
    .order("orden", { ascending: false })
    .limit(1);
  const siguienteOrden = (existentes?.[0]?.orden ?? 0) + 1;

  const { error } = await supabase.from("contenido_ubicaciones").insert({
    contenido_id: contenidoId,
    contexto: "modulo",
    modulo_id: moduloId,
    orden: siguienteOrden,
  });
  if (error) throw error;
  revalidatePath(`/admin/biblioteca/${contenidoId}`);
  revalidatePath("/admin/cursos");
}

// Quita el contenido de ese lugar puntual — el contenido en sí sigue
// existiendo y puede seguir apareciendo en cualquier otro lugar.
export async function quitarUbicacion(ubicacionId: string, contenidoId: string) {
  const { supabase } = await exigirStaff();
  const { error } = await supabase.from("contenido_ubicaciones").delete().eq("id", ubicacionId);
  if (error) throw error;
  revalidatePath(`/admin/biblioteca/${contenidoId}`);
  revalidatePath("/admin/cursos");
}
