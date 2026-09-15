import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { cambiarNivelUsuaria, cambiarRolUsuaria } from "@/lib/acciones/admin";

export default async function AdminUsuariasPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: miAutorizacion } = await supabase
    .from("autorizaciones")
    .select("rol")
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (miAutorizacion?.rol !== "admin") redirect("/admin");

  const { data: perfiles } = await supabase
    .from("perfiles")
    .select("id, nombre, fecha_registro")
    .order("fecha_registro", { ascending: false });

  const { data: autorizaciones } = await supabase.from("autorizaciones").select("usuario_id, nivel, rol");
  const autPorId = new Map((autorizaciones ?? []).map((a) => [a.usuario_id, a]));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Usuarias</h1>
      <div className="space-y-3">
        {(perfiles ?? []).map((p) => {
          const aut = autPorId.get(p.id);
          const nivel = aut?.nivel ?? "gratis";
          const rol = aut?.rol ?? "miembro";
          const aPremium = cambiarNivelUsuaria.bind(null, p.id, "premium");
          const aGratis = cambiarNivelUsuaria.bind(null, p.id, "gratis");

          return (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-texto/10 bg-tarjeta p-4">
              <div>
                <p className="font-medium">{p.nombre || "(sin nombre)"}</p>
                <p className="text-xs text-texto/50">
                  Nivel: {nivel} · Rol: {rol}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {nivel === "gratis" ? (
                  <form action={aPremium}>
                    <button className="rounded-full bg-acento px-3 py-1.5 font-semibold text-white">
                      Pasar a Premium
                    </button>
                  </form>
                ) : (
                  <form action={aGratis}>
                    <button className="rounded-full border border-texto/15 px-3 py-1.5">Volver a Gratis</button>
                  </form>
                )}
                {(["miembro", "editor", "admin"] as const).map((r) => {
                  const cambiar = cambiarRolUsuaria.bind(null, p.id, r);
                  return (
                    <form key={r} action={cambiar}>
                      <button
                        className={`rounded-full border px-3 py-1.5 ${
                          rol === r ? "border-acentoTeal text-acentoTeal" : "border-texto/15"
                        }`}
                      >
                        {r}
                      </button>
                    </form>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
