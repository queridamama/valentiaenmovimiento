import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que requieren sesión iniciada. Todo lo bajo /app/(app) vive detrás
// de este chequeo; login, registro y auth/* quedan afuera a propósito.
const RUTAS_PROTEGIDAS = [
  "/inicio",
  "/mi-sueno",
  "/comunidad",
  "/perfil",
  "/admin",
  "/experiencias",
  "/mi-proyecto",
  "/movimiento",
  "/membresia",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() revalida contra el servidor de Auth en cada request — es la
  // llamada correcta para decisiones de acceso (a diferencia de getSession(),
  // que no revalida el token). Ver documento de auditoría para el detalle.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const esRutaProtegida = RUTAS_PROTEGIDAS.some((ruta) =>
    request.nextUrl.pathname.startsWith(ruta)
  );

  if (esRutaProtegida && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Nota de arquitectura: acá solo se resuelve "¿hay sesión?". La distinción
  // fina de rol (admin/editor/miembro) y nivel (gratis/premium) se resuelve
  // en cada página vía RLS + lectura de `autorizaciones`, no en el
  // middleware, para no duplicar la fuente de verdad de permisos.
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
