import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import FormularioActualizarContrasena from "./FormularioActualizarContrasena";

// El link del mail de recuperación NO deja una sesión de recuperación
// establecida solo por llegar acá: con @supabase/ssr el proyecto está en
// flujo PKCE, así que Supabase redirige con `?code=` (o, si el día de
// mañana se personaliza la plantilla, con `token_hash`+`type=recovery`) y
// hay que canjearlo explícitamente por una sesión ANTES de mostrar el
// formulario — nunca asumir que el hash de la URL la establece solo,
// eso era el flujo implícito viejo, no PKCE.
export default async function ActualizarContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; token_hash?: string }>;
}) {
  const { code, token_hash } = await searchParams;

  if (code || token_hash) {
    const supabase = await crearClienteServidor();
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ type: "recovery", token_hash: token_hash! });
    if (error) redirect("/auth/error");
    // Ya quedó canjeado por una sesión de recuperación (cookies) — se
    // saca el `code`/`token_hash` de la URL con un redirect limpio, así
    // que un refresh de la página no intenta canjearlo de nuevo.
    redirect("/actualizar-contrasena");
  }

  return <FormularioActualizarContrasena />;
}
