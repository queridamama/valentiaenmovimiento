import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

// Patrón oficial de Supabase para Next.js App Router. Con la plantilla
// estándar ({{ .ConfirmationURL }}, la única editable sin configurar SMTP
// propio) y el proyecto en flujo PKCE (@supabase/ssr), ese link redirige
// acá con `?code=` — nunca con el token "crudo" en la URL visible. Se
// mantiene también `token_hash` + `type` → verifyOtp() como fallback, por
// si el día de mañana se personalizan las plantillas para usar
// {{ .TokenHash }} en cambio. Ver: supabase.com/docs/guides/auth/server-side/nextjs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/inicio";

  if (code || (token_hash && type)) {
    const supabase = await crearClienteServidor();
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ type: type!, token_hash: token_hash! });
    if (!error) {
      redirect(next);
    }
  }

  redirect("/auth/error");
}
