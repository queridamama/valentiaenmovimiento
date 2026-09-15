import { crearClienteServidor } from "@/lib/supabase/server";
import { guardarExperiencia } from "@/lib/acciones/admin";
import FormularioExperiencia from "@/components/admin/FormularioExperiencia";
import type { AreaRespuesta } from "@/lib/tipos";

export default async function EditarExperienciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();

  const [{ data: etapas }, { data: experiencia }, { data: preguntas }] = await Promise.all([
    supabase.from("etapas_ruta").select("id, nombre").order("orden"),
    supabase
      .from("experiencias")
      .select("titulo, descripcion, texto_intro, video_url, etapa_id, nivel_acceso, estado, orden")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("preguntas_experiencia")
      .select("id, texto, placeholder, area_respuesta, orden")
      .eq("experiencia_id", id)
      .order("orden"),
  ]);

  if (!experiencia) {
    return <p className="text-sm text-texto/50">Experiencia no encontrada.</p>;
  }

  const accion = guardarExperiencia.bind(null, id);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Editar experiencia</h1>
      <FormularioExperiencia
        accion={accion}
        etapas={etapas ?? []}
        inicial={{
          titulo: experiencia.titulo,
          descripcion: experiencia.descripcion ?? "",
          texto_intro: experiencia.texto_intro ?? "",
          video_url: experiencia.video_url ?? "",
          etapa_id: experiencia.etapa_id,
          nivel_acceso: experiencia.nivel_acceso,
          estado: experiencia.estado,
          orden: experiencia.orden,
        }}
        preguntasIniciales={(preguntas ?? []).map((p) => ({
          id: p.id,
          texto: p.texto,
          placeholder: p.placeholder ?? "",
          area_respuesta: p.area_respuesta as AreaRespuesta,
          orden: p.orden,
        }))}
      />
    </div>
  );
}
