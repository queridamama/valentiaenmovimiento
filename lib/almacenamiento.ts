import "server-only";
import { crearClienteServicio } from "@/lib/supabase/servicio";

export const BUCKET_PRIVADO = "medios-privados";
export const BUCKET_PUBLICO = "medios-publicos";

// Firma una URL temporal para un archivo del bucket privado. SIEMPRE con
// el cliente de servicio (bypassea RLS) — por diseño, quien llama a esto
// ya tuvo que comprobar el acceso real por su cuenta (ver los dos casos de
// uso en lib/acciones/almacenamiento.ts: una staff que sube/gestiona, o
// una alumna leyendo una fila a la que RLS ya la dejó llegar). Esta
// función en sí NO decide quién puede ver qué — por eso no está exportada
// como Server Action ni es llamable directo desde el cliente.
export async function firmarUrlPrivada(path: string, segundosValidez = 300): Promise<string | null> {
  const servicio = crearClienteServicio();
  const { data } = await servicio.storage.from(BUCKET_PRIVADO).createSignedUrl(path, segundosValidez);
  return data?.signedUrl ?? null;
}
