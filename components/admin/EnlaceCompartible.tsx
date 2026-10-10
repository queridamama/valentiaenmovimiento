"use client";

import { useEffect, useState } from "react";

export default function EnlaceCompartible({ path }: { path: string }) {
  const [copiado, setCopiado] = useState(false);
  const [url, setUrl] = useState(path);

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  async function copiar() {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-acento/25 bg-acento/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-acento">Link para compartir</p>
        <p className="mt-1 truncate text-sm text-texto/65">{url}</p>
      </div>
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 rounded-full bg-acento px-4 py-2 text-sm font-semibold text-white"
      >
        {copiado ? "Copiado ✓" : "Copiar link"}
      </button>
    </div>
  );
}
