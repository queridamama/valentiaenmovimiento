"use client";

import { useState, useTransition } from "react";
import { cancelarSuscripcion } from "@/lib/acciones/membresia";

interface Props {
  // "premium" (default, comportamiento sin cambios): la usuaria ya es
  // Premium por Mercado Pago — se usa sobre el fondo oscuro (bg-marca)
  // de Perfil. "intento": tiene un preapproval sin cancelar pero el pago
  // fue rechazado o todavía se está confirmando — nunca llegó a ser
  // Premium, así que ni la copia puede decir que sí, ni los colores
  // pueden asumir el fondo oscuro (esta variante se usa sobre el fondo
  // claro de la cuenta Gratis).
  contexto?: "premium" | "intento";
}

// Cancelación con un paso de confirmación simple, sin dark patterns: un
// solo "¿estás segura?" con dos botones igual de visibles, nada de
// culpa ni de ofertas de último momento para retenerla.
export default function BotonCancelarSuscripcion({ contexto = "premium" }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelada, setCancelada] = useState(false);

  const esIntento = contexto === "intento";
  const etiquetaBoton = esIntento ? "Cancelar este intento" : "Cancelar suscripción";
  const pregunta = esIntento
    ? "¿Querés cancelar este intento de suscripción a Valentía Premium?"
    : "¿Querés cancelar tu suscripción a Valentía Premium?";
  const mensajeCancelada = esIntento ? "El intento quedó cancelado." : "Tu suscripción quedó cancelada.";

  if (cancelada) {
    return <p className={`text-[13.5px] ${esIntento ? "text-texto/60" : "text-white/70"}`}>{mensajeCancelada}</p>;
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className={`text-[13px] font-semibold underline underline-offset-4 ${
          esIntento ? "text-marca/80 decoration-marca/40" : "text-white/80 decoration-white/40"
        }`}
      >
        {etiquetaBoton}
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
    <div className={`space-y-3 rounded-[18px] p-4 ${esIntento ? "bg-marca/5" : "bg-white/10"}`}>
      <p className={`text-[13.5px] font-medium ${esIntento ? "text-marca" : "text-white"}`}>{pregunta}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={confirmar}
          disabled={pending}
          className={`rounded-full px-4 py-2 text-[12.5px] font-semibold disabled:opacity-60 ${
            esIntento ? "bg-marca text-white" : "bg-white text-marca"
          }`}
        >
          {pending ? "Cancelando…" : "Sí, cancelar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={pending}
          className={`rounded-full border px-4 py-2 text-[12.5px] font-semibold ${
            esIntento ? "border-marca/30 text-marca" : "border-white/40 text-white"
          }`}
        >
          {esIntento ? "Volver" : "Seguir siendo Premium"}
        </button>
      </div>
      {error && <p className={`text-[12.5px] ${esIntento ? "text-alerta" : "text-acentoRosa"}`}>{error}</p>}
    </div>
  );
}
