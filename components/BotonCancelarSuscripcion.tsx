"use client";

import { useState, useTransition } from "react";
import { cancelarSuscripcion } from "@/lib/acciones/membresia";

// Cancelación con un paso de confirmación simple, sin dark patterns: un
// solo "¿estás segura?" con dos botones igual de visibles, nada de
// culpa ni de ofertas de último momento para retenerla.
export default function BotonCancelarSuscripcion() {
  const [confirmando, setConfirmando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelada, setCancelada] = useState(false);

  if (cancelada) {
    return <p className="text-[13.5px] text-white/70">Tu suscripción quedó cancelada.</p>;
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="text-[13px] font-semibold text-white/80 underline decoration-white/40 underline-offset-4"
      >
        Cancelar suscripción
      </button>
    );
  }

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const resultado = await cancelarSuscripcion();
      if ("error" in resultado) {
        setError(resultado.error);
        return;
      }
      setCancelada(true);
    });
  }

  return (
    <div className="space-y-3 rounded-[18px] bg-white/10 p-4">
      <p className="text-[13.5px] font-medium text-white">¿Querés cancelar tu suscripción a Valentía Premium?</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={confirmar}
          disabled={pending}
          className="rounded-full bg-white px-4 py-2 text-[12.5px] font-semibold text-marca disabled:opacity-60"
        >
          {pending ? "Cancelando…" : "Sí, cancelar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={pending}
          className="rounded-full border border-white/40 px-4 py-2 text-[12.5px] font-semibold text-white"
        >
          Seguir siendo Premium
        </button>
      </div>
      {error && <p className="text-[12.5px] text-acentoRosa">{error}</p>}
    </div>
  );
}
