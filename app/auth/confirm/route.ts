import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

// Patrón oficial de Supabase para Next.js App Router: el link del mail de
// confirmación apunta acá con token_hash + type; nunca con el token "crudo"
// en la URL visible. Ver: supabase.com/docs/guides/auth/server-side/nextjs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/inicio";

  if (token_hash && type) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(next);
    }
  }

  redirect("/auth/error");
}
