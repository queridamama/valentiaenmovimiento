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
export async function firmarUrlPrivada(
  path: string,
  segundosValidez = 300,
  opciones?: { descargar?: boolean | string }
): Promise<string | null> {
  // `crearClienteServicio()` construye el cliente con la secret key recién
  // acá adentro (no al importar el módulo) — si esa env var faltara o
  // estuviera mal en algún ambiente, `createClient` de supabase-js tira
  // una excepción SÍNCRONA ("supabaseKey is required"), no un
  // { data, error }. Todo caller de esta función (obtenerAudioPublicacion,
  // resolverArchivo, y la vista de experiencia) solo espera "la URL
  // firmada, o null si no se pudo" — nunca estuvo preparado para que esto
  // reviente la página entera. Por eso todo el cuerpo va envuelto: un
  // fallo acá degrada a "no mostrar el archivo", nunca a un error de
  // servidor.
  try {
    const servicio = crearClienteServicio();
    const { data, error } = await servicio.storage
      .from(BUCKET_PRIVADO)
      .createSignedUrl(path, segundosValidez, opciones?.descargar !== undefined ? { download: opciones.descargar } : undefined);
    if (error) {
      console.error("firmarUrlPrivada: no se pudo firmar", path, error.message);
      return null;
    }
    return data?.signedUrl ?? null;
  } catch (err) {
    console.error("firmarUrlPrivada: excepción al firmar", path, err);
    return null;
  }
}
