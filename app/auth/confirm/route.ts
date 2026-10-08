import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

// Supabase puede consumir el enlace de confirmación antes de regresar a la app.
// En ese caso la URL de retorno no contiene un código reutilizable: no implica
// que la cuenta haya fallado o que el enlace esté vencido.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const requestedNext = searchParams.get("next") ?? "/inicio";
  // Evitar redirecciones externas o rutas relativas ambiguas.
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/inicio";
  const supabase = await crearClienteServidor();

  if (code || (token_hash && type)) {
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ type: type!, token_hash: token_hash! });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Si ya hay sesión, un código consumido no debe impedir entrar a Valentía.
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email_confirmed_at) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  // Sin código no podemos concluir que caducó: Supabase puede haberlo
  // consumido correctamente antes de redirigir al sitio.
  const result = new URL("/auth/error", request.url);
  result.searchParams.set("estado", code || token_hash ? "enlace" : "confirmacion");
  return NextResponse.redirect(result);
}
