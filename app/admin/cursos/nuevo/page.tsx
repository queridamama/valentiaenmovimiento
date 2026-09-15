import { guardarCurso } from "@/lib/acciones/cursos";

export default function NuevoCursoPage() {
  const accion = guardarCurso.bind(null, null);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-2xl font-semibold">Nuevo curso</h1>
      <form action={accion} className="space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto/70">Título</span>
          <input name="titulo" required className="rounded-lg border border-texto/15 px-3 py-2" />
        </label>
        <button type="submit" className="rounded-full bg-acento px-6 py-3 text-sm font-semibold text-white">
          Crear y agregar módulos
        </button>
      </form>
    </div>
  );
}
