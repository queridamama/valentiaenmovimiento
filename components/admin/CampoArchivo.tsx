"use client";

import { useEffect, useState, useTransition } from "react";
import { subirArchivo, obtenerPreviewAdmin } from "@/lib/acciones/almacenamiento";

interface Props {
  label: string;
  name: string;
  destino: "portada" | "audio" | "archivo";
  accept: string;
  tipo: "imagen" | "audio" | "archivo";
  valorInicial?: string;
}

// Un solo campo para "subir y guardar la referencia". Para "portada" esa
// referencia es una URL pública estable, así que se puede mostrar tal
// cual. Para "audio"/"archivo" es un path dentro del bucket privado
// (ver supabase/migrations/0004_storage.sql): la vista previa nunca es esa
// URL guardada — siempre una URL firmada de corta duración, recién
// pedida, porque la anterior ya pudo haber expirado.
export default function CampoArchivo({ label, name, destino, accept, tipo, valorInicial = "" }: Props) {
  const esPublico = destino === "portada";
  const [valorGuardado, setValorGuardado] = useState(valorInicial);
  const [previewUrl, setPreviewUrl] = useState(esPublico ? valorInicial : "");
  const [error, setError] = useState<string | null>(null);
  const [trabajando, startTransition] = useTransition();

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

  function manejarCambio(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    setError(null);
    const formData = new FormData();
    formData.set("archivo", archivo);

    startTransition(async () => {
      const resultado = await subirArchivo(destino, formData);
      if (resultado.error) {
        setError(resultado.error);
        return;
      }
      setValorGuardado(resultado.valorGuardado ?? "");
      setPreviewUrl(resultado.previewUrl ?? "");
    });
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
      {!previewUrl && valorGuardado && trabajando && (
        <p className="text-xs text-texto/45">Cargando vista previa…</p>
      )}

      <div className="flex items-center gap-3">
        <input type="file" accept={accept} onChange={manejarCambio} className="text-sm" />
        {trabajando && <span className="text-xs text-texto/45">Un momento…</span>}
      </div>

      {valorGuardado && !trabajando && (
        <button type="button" onClick={quitar} className="w-fit text-xs font-medium text-alerta">
          Quitar
        </button>
      )}
      {error && <p className="text-xs text-alerta">{error}</p>}
    </div>
  );
}
