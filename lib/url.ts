// URL pública y canónica de la app — la usa todo flujo de Auth que arma un
// link absoluto (mail de confirmación de registro, recuperación de
// contraseña). Configurar NEXT_PUBLIC_APP_URL en Vercel con el dominio
// productivo real: el día que cambie el dominio alcanza con cambiar esta
// variable, sin tocar código. Sin la variable seteada (dev local) cae a
// location.origin.
export function urlApp(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
  return base.replace(/\/$/, "");
}

// Valida un destino de redirect post-auth (los query params `redirect` de
// /login y /registro, y `next` de /auth/confirm): tiene que ser una ruta
// relativa propia de la app. Rechaza cualquier URL externa y también una
// ruta "protocol-relative" ("//evil.com"), que el navegador interpretaría
// como otro host — evita que ese query param se use como open redirect.
export function redirectSeguro(valor: string | null | undefined): string | null {
  if (!valor) return null;
  if (!valor.startsWith("/") || valor.startsWith("//")) return null;
  return valor;
}
