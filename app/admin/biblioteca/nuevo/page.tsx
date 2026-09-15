import { guardarContenido } from "@/lib/acciones/contenidos";
import { ETIQUETA_TIPO_CONTENIDO, TIPOS_CONTENIDO } from "@/lib/tipos";

export default function NuevoContenidoPage() {
  const accion = guardarContenido.bind(null, null);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-2xl font-semibold">Nuevo contenido</h1>
      <p className="text-sm text-texto/55">
        Elegí el tipo y el título para arrancar — el resto (texto, video, audio, dónde aparece) se completa en el
        siguiente paso.
      </p>
      <form action={accion} className="space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Tipo de contenido</span>
          <select name="tipo" defaultValue="clase" className="rounded-lg border border-texto/15 px-3 py-2">
            {TIPOS_CONTENIDO.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_CONTENIDO[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Título</span>
          <input name="titulo" required className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>
        <button type="submit" className="rounded-full bg-acento px-6 py-3 text-sm font-semibold text-white">
          Crear y seguir editando
        </button>
      </form>
    </div>
  );
}
