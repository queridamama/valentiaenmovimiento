import { crearClienteServidor } from "@/lib/supabase/server";
import { guardarExperiencia } from "@/lib/acciones/admin";
import FormularioExperiencia from "@/components/admin/FormularioExperiencia";

export default async function NuevaExperienciaPage() {
  const supabase = await crearClienteServidor();
  const [{ data: etapas }, { data: modulos }] = await Promise.all([
    supabase.from("etapas_ruta").select("id, nombre").order("orden"),
    supabase.from("modulos_ruta").select("id, titulo, etapas_ruta(nombre)").order("orden"),
  ]);

  const accion = guardarExperiencia.bind(null, null);
  const modulosParaForm = (modulos ?? []).map((m) => {
    const etapa = Array.isArray(m.etapas_ruta) ? m.etapas_ruta[0] : m.etapas_ruta;
    return { id: m.id, titulo: m.titulo, etapaNombre: etapa?.nombre ?? "" };
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Nueva experiencia</h1>
      <FormularioExperiencia accion={accion} etapas={etapas ?? []} modulos={modulosParaForm} />
    </div>
  );
}
