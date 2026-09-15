import { crearClienteServidor } from "@/lib/supabase/server";
import { crearSueno, crearMovimiento, crearEvidencia } from "@/lib/acciones/sueno";

export default async function MiSuenoPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sueno } = await supabase
    .from("suenos")
    .select("id, descripcion, por_que_importa")
    .eq("usuario_id", user?.id)
    .eq("estado", "activo")
    .maybeSingle();

  if (!sueno) {
    return (
      <main className="mx-auto max-w-md space-y-6 px-6 py-10">
        <h1 className="font-display text-2xl">Declará tu sueño</h1>
        <form action={crearSueno} className="flex flex-col gap-4">
          <textarea
            name="descripcion"
            placeholder="¿Cuál es tu sueño?"
            required
            rows={3}
            className="rounded-card border border-acentoSuave px-4 py-3"
          />
          <textarea
            name="por_que_importa"
            placeholder="¿Por qué te importa?"
            rows={3}
            className="rounded-card border border-acentoSuave px-4 py-3"
          />
          <button type="submit" className="rounded-card bg-acento px-6 py-3 text-fondo">
            Guardar mi sueño
          </button>
        </form>
      </main>
    );
  }

  const { data: movimientos } = await supabase
    .from("movimientos_semanales")
    .select("id, descripcion, estado, fecha_creado")
    .eq("sueno_id", sueno.id)
    .order("fecha_creado", { ascending: false });

  const { data: evidencias } = await supabase
    .from("evidencias")
    .select("id, contenido, fecha_creado")
    .eq("sueno_id", sueno.id)
    .order("fecha_creado", { ascending: false });

  const movimientoSinEvidencia = movimientos?.find((m) => m.estado === "planeado");

  const crearMovimientoConSueno = crearMovimiento.bind(null, sueno.id);
  const crearEvidenciaConSueno = crearEvidencia.bind(
    null,
    sueno.id,
    movimientoSinEvidencia?.id ?? null
  );

  return (
    <main className="mx-auto max-w-md space-y-8 px-6 py-10">
      <section className="rounded-card border border-acentoSuave p-4">
        <p className="text-sm text-texto/60">Mi sueño</p>
        <p className="mt-1">{sueno.descripcion}</p>
        {sueno.por_que_importa && (
          <p className="mt-2 text-sm text-texto/70">{sueno.por_que_importa}</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg">Movimiento</h2>
        {movimientoSinEvidencia ? (
          <div className="rounded-card border border-acentoSuave p-4">
            <p>{movimientoSinEvidencia.descripcion}</p>
            <p className="mt-1 text-sm text-texto/60">Pendiente de evidencia</p>
          </div>
        ) : (
          <form action={crearMovimientoConSueno} className="flex flex-col gap-3">
            <textarea
              name="descripcion"
              placeholder="¿Cuál va a ser tu próximo movimiento?"
              required
              rows={2}
              className="rounded-card border border-acentoSuave px-4 py-3"
            />
            <button type="submit" className="rounded-card bg-acento px-6 py-3 text-fondo">
              Registrar movimiento
            </button>
          </form>
        )}
      </section>

      {movimientoSinEvidencia && (
        <section className="space-y-3">
          <h2 className="font-display text-lg">Evidencia</h2>
          <form action={crearEvidenciaConSueno} className="flex flex-col gap-3">
            <textarea
              name="contenido"
              placeholder="Contá qué hiciste"
              required
              rows={2}
              className="rounded-card border border-acentoSuave px-4 py-3"
            />
            <button type="submit" className="rounded-card bg-acento px-6 py-3 text-fondo">
              Registrar evidencia
            </button>
          </form>
        </section>
      )}

      {evidencias && evidencias.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg">Tu recorrido</h2>
          <ul className="space-y-2">
            {evidencias.map((ev) => (
              <li key={ev.id} className="rounded-card border border-acentoSuave p-3 text-sm">
                {ev.contenido}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
