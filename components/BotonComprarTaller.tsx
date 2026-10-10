"use client";

import { useState, useTransition } from "react";
import { iniciarCompraTaller } from "@/lib/acciones/taller-hacerle-lugar";

export default function BotonComprarTaller() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function comprar() {
    setError(null);
    startTransition(async () => {
      const resultado = await iniciarCompraTaller();
      if ("error" in resultado) {
        setError(resultado.error);
        return;
      }
      window.location.assign(resultado.initPoint);
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={comprar}
        disabled={pending}
        className="block w-full rounded-full bg-marca px-6 py-4 text-center text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Abriendo Mercado Pago…" : "Quiero este encuentro · $45.000"}
      </button>
      {error && <p className="text-center text-[13px] text-alerta">{error}</p>}
    </div>
  );
}
