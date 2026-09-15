"use client";

import { useState, useTransition } from "react";
import { subirArchivo } from "@/lib/acciones/almacenamiento";

interface Props {
  label: string;
  name: string;
  carpeta: "portadas" | "audios" | "archivos";
  accept: string;
  tipo: "imagen" | "audio" | "archivo";
  valorInicial?: string;
}

// Un solo campo para "subir y guardar la URL": el input de archivo dispara
// la subida al tocarlo, y mientras tanto el <input type="hidden"> que
// viaja con el resto del formulario va llevando la URL resultante. No hace
// falta ningún paso extra ni pantalla intermedia.
export default function CampoArchivo({ label, name, carpeta, accept, tipo, valorInicial = "" }: Props) {
  const [url, setUrl] = useState(valorInicial);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, startTransition] = useTransition();

  function manejarCambio(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    setError(null);
    const formData = new FormData();
    formData.set("archivo", archivo);

    startTransition(async () => {
      const resultado = await subirArchivo(carpeta, formData);
      if (resultado.error) setError(resultado.error);
      else setUrl(resultado.url ?? "");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-texto/70">{label}</span>
      <input type="hidden" name={name} value={url} readOnly />

      {url && tipo === "imagen" && (
        // eslint-disable-next-line @next/next/no-img-element -- viene de Storage, no de /public
        <img src={url} alt="" className="h-24 w-24 rounded-lg border border-texto/10 object-cover" />
      )}
      {url && tipo === "audio" && <audio src={url} controls className="w-full" />}
      {url && tipo === "archivo" && (
        <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-acento underline">
          Ver archivo actual
        </a>
      )}

      <div className="flex items-center gap-3">
        <input type="file" accept={accept} onChange={manejarCambio} className="text-sm" />
        {subiendo && <span className="text-xs text-texto/45">Subiendo…</span>}
      </div>

      {url && !subiendo && (
        <button type="button" onClick={() => setUrl("")} className="w-fit text-xs font-medium text-alerta">
          Quitar
        </button>
      )}
      {error && <p className="text-xs text-alerta">{error}</p>}
    </div>
  );
}
