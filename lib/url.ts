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
