"use client";

import { useEffect, useState, useTransition } from "react";
import { crearClienteBrowser } from "@/lib/supabase/client";
import { obtenerPreviewAdmin } from "@/lib/acciones/almacenamiento";

interface Props {
  label: string;
  name: string;
  destino: "portada" | "audio" | "archivo";
  accept: string;
  tipo: "imagen" | "audio" | "archivo";
  valorInicial?: string;
}

type Destino = Props["destino"];

// Mismos límites/mime que ya exigía subirArchivo (lib/acciones/almacenamiento.ts,
// ahora sin otro caller — se deja intacta por si hiciera falta en el
// futuro, pero CampoArchivo ya no la usa). Se duplican acá a propósito:
// un PDF de pocos MB ya superaba el límite DURO de 4.5MB que Vercel
// Functions impone al body de cualquier Server Action — un límite de la
// plataforma, no de Next (ni bodySizeLimit en next.config.js, ni nada de
// código, puede subirlo). Por eso el archivo binario YA NO viaja por
// ninguna Server Action: sube directo del navegador a Supabase Storage
// con el cliente de sesión (crearClienteBrowser), que lleva la misma
// cookie de auth que ya usa toda /admin. La seguridad real sigue siendo
// la misma de siempre y no cambió un bit: las policies de
// storage.objects (0004_storage.sql) exigen es_staff() para insert/
// update/delete en los dos buckets — una alumna con este mismo código
// corriendo en su navegador igual no podría subir nada, porque Supabase
// rechaza el insert en la base, no algo que dependa de este componente
// ni de ningún chequeo en el cliente. Lo único que sigue pasando por una
// Server Action es obtenerPreviewAdmin: manda un path de texto (nunca el
// archivo), así que nunca pega contra ningún límite de tamaño.
const CONFIGURACION: Record<
  Destino,
  { bucket: string; carpeta: string; mime: string[]; maxMb: number; publico: boolean }
> = {
  portada: { bucket: "medios-publicos", carpeta: "portadas", mime: ["image/"], maxMb: 5, publico: true },
  audio: { bucket: "medios-privados", carpeta: "audios", mime: ["audio/"], maxMb: 30, publico: false },
  archivo: { bucket: "medios-privados", carpeta: "archivos", mime: ["application/pdf"], maxMb: 20, publico: false },
};

// Un solo campo para "subir y guardar la referencia". Para "portada" esa
// referencia es una URL pública estable, así que se puede mostrar tal
// cual. Para "audio"/"archivo" es un path dentro del bucket privado
// (ver supabase/migrations/0004_storage.sql): la vista previa nunca es esa
// URL guardada — siempre una URL firmada de corta duración, recién
// pedida, porque la anterior ya pudo haber expirado.
export default function CampoArchivo({ label, name, destino, accept, tipo, valorInicial = "" }: Props) {
  const config = CONFIGURACION[destino];
  const esPublico = config.publico;
  const [valorGuardado, setValorGuardado] = useState(valorInicial);
  const [previewUrl, setPreviewUrl] = useState(esPublico ? valorInicial : "");
  const [error, setError] = useState<string | null>(null);
  const [trabajando, startTransition] = useTransition();
  const [subiendo, setSubiendo] = useState(false);
  const ocupado = trabajando || subiendo;

  useEffect(() => {
    if (!esPublico && valorInicial) {
      startTransition(async () => {
        const resultado = await obtenerPreviewAdmin(valorInicial);
        if (resultado.error) setError(resultado.error);
        else setPreviewUrl(resultado.url ?? "");
      });
    }
    // Solo al montar: refresca la preview del valor con el que llegó el campo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function manejarCambio(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    setError(null);

    if (!config.mime.some((prefijo) => archivo.type.startsWith(prefijo))) {
      setError("Ese tipo de archivo no está permitido acá.");
      return;
    }
    if (archivo.size > config.maxMb * 1024 * 1024) {
      setError(`El archivo no puede pesar más de ${config.maxMb}MB.`);
      return;
    }

    setSubiendo(true);
    try {
      // "archivo" (PDF) siempre guarda con extensión .pdf fija — el mime
      // ya está forzado a application/pdf arriba, así que no hace falta
      // (ni conviene) derivarla del nombre original. Para audio/portada
      // sí se conserva la extensión real del archivo subido.
      const extension =
        destino === "archivo"
          ? "pdf"
          : archivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${config.carpeta}/${crypto.randomUUID()}.${extension}`;

      const supabase = crearClienteBrowser();
      const { error: errorSubida } = await supabase.storage.from(config.bucket).upload(path, archivo, {
        contentType: archivo.type,
        upsert: false,
      });
      if (errorSubida) {
        setError(errorSubida.message);
        return;
      }

      if (esPublico) {
        const { data } = supabase.storage.from(config.bucket).getPublicUrl(path);
        setValorGuardado(data.publicUrl);
        setPreviewUrl(data.publicUrl);
        return;
      }

      // El binario ya terminó de subir — lo único que falta es la URL
      // firmada para previsualizarlo acá mismo, y eso sí puede pedirse
      // con la Server Action existente: solo viaja un path de texto.
      startTransition(async () => {
        const resultado = await obtenerPreviewAdmin(path);
        setValorGuardado(path);
        if (resultado.error) setError(resultado.error);
        else setPreviewUrl(resultado.url ?? "");
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el archivo.");
    } finally {
      setSubiendo(false);
    }
  }

  function quitar() {
    setValorGuardado("");
    setPreviewUrl("");
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-texto/70">{label}</span>
      <input type="hidden" name={name} value={valorGuardado} readOnly />

      {previewUrl && tipo === "imagen" && (
        // eslint-disable-next-line @next/next/no-img-element -- viene de Storage, no de /public
        <img src={previewUrl} alt="" className="h-24 w-24 rounded-lg border border-texto/10 object-cover" />
      )}
      {previewUrl && tipo === "audio" && <audio src={previewUrl} controls className="w-full" />}
      {previewUrl && tipo === "archivo" && (
        <a href={previewUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-acento underline">
          Ver archivo actual
        </a>
      )}
      {!previewUrl && valorGuardado && ocupado && (
        <p className="text-xs text-texto/45">Cargando vista previa…</p>
      )}

      <div className="flex items-center gap-3">
        <input type="file" accept={accept} onChange={manejarCambio} disabled={ocupado} className="text-sm" />
        {ocupado && <span className="text-xs text-texto/45">Un momento…</span>}
      </div>

      {valorGuardado && !ocupado && (
        <button type="button" onClick={quitar} className="w-fit text-xs font-medium text-alerta">
          Quitar
        </button>
      )}
      {error && <p className="text-xs text-alerta">{error}</p>}
    </div>
  );
}
