import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// API actual de @supabase/ssr (>=0.5): getAll/setAll, no get/set/remove
// por cookie individual — ese patrón quedó deprecado. `cookies()` de
// Next.js 15+/16 es async, por eso este helper también lo es.
export async function crearClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se ignora: puede llamarse desde un Server Component, donde
            // Next no permite escribir cookies. El middleware (ver
            // middleware.ts) se encarga de refrescar la sesión en esos casos.
          }
        },
      },
    }
  );
}
