"use server";

import { exigirStaff } from "@/lib/autorizacion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { firmarUrlPrivada, BUCKET_PRIVADO, BUCKET_PUBLICO } from "@/lib/almacenamiento";

// "portada" es la única categoría pública (imágenes de tapa: se muestran
// libremente, como ya pasaba con las URLs de video externas). "audio" y
// "archivo" son SIEMPRE privados — código o URL no alcanza para verlos,
// hace falta una URL firmada emitida por una de las acciones de abajo.
const CONFIGURACION = {
  portada: { bucket: BUCKET_PUBLICO, carpeta: "portadas", mime: ["image/"], maxMb: 5, publico: true },
  audio: { bucket: BUCKET_PRIVADO, carpeta: "audios", mime: ["audio/"], maxMb: 30, publico: false },
  archivo: { bucket: BUCKET_PRIVADO, carpeta: "archivos", mime: ["application/pdf"], maxMb: 20, publico: false },
} as const;

type Destino = keyof typeof CONFIGURACION;

export interface ResultadoSubida {
  // Lo que se guarda en la base y viaja en el <input hidden>: una URL
  // pública estable si es "portada", o el PATH dentro del bucket privado
  // si es "audio"/"archivo" — nunca una URL firmada (esas expiran).
  valorGuardado: string | null;
  // Con qué se muestra ahora mismo en el formulario: la misma URL pública,
  // o una URL firmada de corta duración recién emitida.
  previewUrl: string | null;
  error: string | null;
}

// Solo admin/editor puede llamar a esto (exigirStaff) y, además, las
// policies de Storage (0004_storage.sql) exigen es_staff() para el
// insert — dos candados independientes para que una alumna nunca pueda
// subir nada al CMS.
export async function subirArchivo(destino: Destino, formData: FormData): Promise<ResultadoSubida> {
  const { supabase } = await exigirStaff();
  const config = CONFIGURACION[destino];

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { valorGuardado: null, previewUrl: null, error: "Elegí un archivo." };
  }
  if (!config.mime.some((prefijo) => archivo.type.startsWith(prefijo))) {
    return { valorGuardado: null, previewUrl: null, error: "Ese tipo de archivo no está permitido acá." };
  }
  if (archivo.size > config.maxMb * 1024 * 1024) {
    return { valorGuardado: null, previewUrl: null, error: `El archivo no puede pesar más de ${config.maxMb}MB.` };
  }

  const extension = archivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${config.carpeta}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(config.bucket).upload(path, archivo, {
    contentType: archivo.type,
    upsert: false,
  });
  if (error) return { valorGuardado: null, previewUrl: null, error: error.message };

  if (config.publico) {
    const { data } = supabase.storage.from(config.bucket).getPublicUrl(path);
    return { valorGuardado: data.publicUrl, previewUrl: data.publicUrl, error: null };
  }

  // Staff tiene su propia policy de lectura sobre el bucket privado (para
  // poder previsualizar justo lo que acaba de subir) — no hace falta el
  // cliente de servicio para este caso.
  const { data: firmada } = await supabase.storage.from(BUCKET_PRIVADO).createSignedUrl(path, 300);
  return { valorGuardado: path, previewUrl: firmada?.signedUrl ?? null, error: null };
}

// Refresca la preview de un archivo privado ya guardado (al entrar a
// editar un contenido que ya tenía audio/PDF cargado, la URL firmada de la
// vez anterior ya expiró). Staff-only, sin chequeo adicional por fila:
// cualquier admin/editor puede gestionar cualquier archivo del CMS, igual
// que ya puede editar cualquier contenido.
export async function obtenerPreviewAdmin(path: string): Promise<{ url: string | null; error: string | null }> {
  const { supabase } = await exigirStaff();
  const { data, error } = await supabase.storage.from(BUCKET_PRIVADO).createSignedUrl(path, 300);
  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}

// Caso distinto: acá quien pide la URL puede ser cualquier alumna
// (autenticada), no solo staff — por eso NO usa exigirStaff. La única
// publicación con audio hoy es la de Meli, abierta a toda usuaria
// logueada; el candado real es el mismo que ya protege la lectura de
// `publicaciones_comunidad` (RLS): si esta consulta no devuelve fila, no
// hay nada para firmar. Recién ahí, y solo ahí, se usa el cliente de
// servicio — para firmar, nunca para decidir el acceso.
export async function obtenerAudioPublicacion(publicacionId: string): Promise<string | null> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: publicacion } = await supabase
    .from("publicaciones_comunidad")
    .select("audio_url")
    .eq("id", publicacionId)
    .maybeSingle();

  if (!publicacion?.audio_url) return null;
  return firmarUrlPrivada(publicacion.audio_url);
}

// Un contenido migrado de WordPress (ver scripts/importar-wordpress.ts)
// guarda en audio_url/archivo_url la URL externa original tal cual — por
// ahora a propósito no se sube el archivo a Storage. Esa URL ya es
// reproducible directo; intentar "firmarla" como si fuera un path del
// bucket privado no encuentra nada y devuelve null. Solo lo que YA es un
// path interno (sin esquema) necesita pasar por firmarUrlPrivada.
function esUrlExterna(valor: string): boolean {
  return /^https?:\/\//i.test(valor);
}

function resolverArchivo(valor: string | null): Promise<string | null> {
  if (!valor) return Promise.resolve(null);
  if (esUrlExterna(valor)) return Promise.resolve(valor);
  return firmarUrlPrivada(valor);
}

// Mismo patrón que obtenerAudioPublicacion, para un contenido de
// Biblioteca/Ruta/Curso: la policy "contenidos_lectura" (contenido_accesible())
// ya decidió si esta fila puede llegar a la alumna — acá solo se firma lo
// que ya llegó, nunca se vuelve a chequear el nivel de acceso.
export async function obtenerArchivosContenido(
  contenidoId: string
): Promise<{ audioUrl: string | null; archivoUrl: string | null }> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { audioUrl: null, archivoUrl: null };

  const { data: contenido } = await supabase
    .from("contenidos")
    .select("audio_url, archivo_url")
    .eq("id", contenidoId)
    .maybeSingle();
  if (!contenido) return { audioUrl: null, archivoUrl: null };

  const [audioUrl, archivoUrl] = await Promise.all([
    resolverArchivo(contenido.audio_url),
    resolverArchivo(contenido.archivo_url),
  ]);
  return { audioUrl, archivoUrl };
}
