import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerConfiguracionHome } from "@/lib/datos";
import { guardarConfiguracionHome } from "@/lib/acciones/inicioAdmin";
import CampoArchivo from "@/components/admin/CampoArchivo";

export default async function AdminInicioPage() {
  const supabase = await crearClienteServidor();
  const config = await obtenerConfiguracionHome(supabase);

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold">Portada del Home</h1>
        <p className="text-sm text-texto/55">
          Lo primero que ve una alumna al entrar a Inicio: la imagen y el texto de portada. Se puede cambiar cuando
          quieras, sin tocar nada más de la app.
        </p>
      </div>

      <form action={guardarConfiguracionHome} className="space-y-4">
        <CampoArchivo
          label="Imagen de portada"
          name="imagen_url"
          destino="portada"
          accept="image/*"
          tipo="imagen"
          valorInicial={config.imagen_url ?? ""}
        />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Eyebrow (línea chica arriba del título)</span>
          <input
            name="eyebrow"
            defaultValue={config.eyebrow ?? ""}
            placeholder="Valentía en Movimiento"
            className="rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Título</span>
          <input
            name="titulo"
            defaultValue={config.titulo ?? ""}
            placeholder="Tomate tus sueños en serio"
            className="rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Bajada</span>
          <textarea
            name="bajada"
            defaultValue={config.bajada ?? ""}
            rows={2}
            placeholder="Un lugar para volver cada semana."
            className="rounded-lg border border-texto/15 px-3 py-2"
          />
        </label>

        <button type="submit" className="rounded-full bg-acento px-6 py-3 text-sm font-semibold text-white">
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
