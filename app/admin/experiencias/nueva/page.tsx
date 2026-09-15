import { crearClienteServidor } from "@/lib/supabase/server";
import { guardarExperiencia } from "@/lib/acciones/admin";
import FormularioExperiencia from "@/components/admin/FormularioExperiencia";

export default async function NuevaExperienciaPage() {
  const supabase = await crearClienteServidor();
  const { data: etapas } = await supabase.from("etapas_ruta").select("id, nombre").order("orden");

  const accion = guardarExperiencia.bind(null, null);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Nueva experiencia</h1>
      <FormularioExperiencia accion={accion} etapas={etapas ?? []} />
    </div>
  );
}
