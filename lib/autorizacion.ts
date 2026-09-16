import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

// Helper compartido por todas las server actions de /admin. Sin "use
// server" a propósito: si este archivo lo tuviera, Next trataría cada
// función exportada como una Server Action pública (con su propio
// endpoint invocable), y esta no es una — es un chequeo interno que usan
// las actions reales.
export async function exigirStaff() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: autorizacion } = await supabase
    .from("autorizaciones")
    .select("rol")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!autorizacion || !["admin", "editor"].includes(autorizacion.rol)) {
    redirect("/inicio");
  }

  return { supabase, user, rol: autorizacion.rol as "admin" | "editor" };
}

// Igual que `exigirStaff`, pero solo para acciones reservadas al rol admin
// (ej. moderar/eliminar publicaciones de usuarias) — un editor puede
// gestionar contenido de Meli, pero no esto.
export async function exigirAdmin() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: autorizacion } = await supabase
    .from("autorizaciones")
    .select("rol")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!autorizacion || autorizacion.rol !== "admin") {
    redirect("/inicio");
  }

  return { supabase, user };
}
