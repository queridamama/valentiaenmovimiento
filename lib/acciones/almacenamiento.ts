"use server";

import { exigirStaff } from "@/lib/autorizacion";

const LIMITES: Record<string, { mime: string[]; maxMb: number }> = {
  portadas: { mime: ["image/"], maxMb: 5 },
  audios: { mime: ["audio/"], maxMb: 30 },
  archivos: { mime: ["application/pdf"], maxMb: 20 },
};

export interface ResultadoSubida {
  url: string | null;
  error: string | null;
}

// Sube un archivo al bucket "medios" (ver supabase/migrations/0004_storage.sql)
// bajo la carpeta que le corresponde por tipo. Solo admin/editor puede
// llamar a esto (exigirStaff, y además lo exige la policy de Storage del
// lado de la base — doble candado, igual que el resto del Admin).
export async function subirArchivo(carpeta: keyof typeof LIMITES, formData: FormData): Promise<ResultadoSubida> {
  const { supabase } = await exigirStaff();

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { url: null, error: "Elegí un archivo." };
  }

  const limite = LIMITES[carpeta];
  if (!limite.mime.some((prefijo) => archivo.type.startsWith(prefijo))) {
    return { url: null, error: "Ese tipo de archivo no está permitido acá." };
  }
  if (archivo.size > limite.maxMb * 1024 * 1024) {
    return { url: null, error: `El archivo no puede pesar más de ${limite.maxMb}MB.` };
  }

  const extension = archivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const nombreArchivo = `${carpeta}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from("medios").upload(nombreArchivo, archivo, {
    contentType: archivo.type,
    upsert: false,
  });
  if (error) return { url: null, error: error.message };

  const { data } = supabase.storage.from("medios").getPublicUrl(nombreArchivo);
  return { url: data.publicUrl, error: null };
}
