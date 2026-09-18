"use client";

import { useState, useTransition } from "react";
import { iniciarSuscripcionAlojada } from "@/lib/acciones/membresia";

// CTA de compra de /membresia: flujo oficial de Mercado Pago
// "Suscripciones sin plan asociado" + pago pendiente + checkout alojado,
// validado con una transacción real. El Server Action solo crea el
// preapproval "pending" y devuelve el `init_point` real de Mercado
// Pago — acá no hay ningún formulario ni campo de tarjeta: todo el
// ingreso/elección del medio de pago ocurre en Mercado Pago, esta app
// nunca recibe ni tokeniza ninguna tarjeta. `window.location.assign` (no
// `router.push`, que es para rutas internas de Next) porque el destino
// es una URL externa, absoluta, a mercadopago.com.
//
// El flujo anterior (Card Form, components/BotonSuscribirse.tsx) queda
// en el código sin usarse acá, como camino de rollback — ver el
// comentario grande en crearPreapprovalSinPlan (lib/mercadopago.ts).
export default function BotonSuscribirseAlojado() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function iniciar() {
    setError(null);
    startTransition(async () => {
      const resultado = await iniciarSuscripcionAlojada();
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
        onClick={iniciar}
        disabled={pending}
        className="block w-full rounded-full bg-marca px-6 py-4 text-center text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Redirigiendo a Mercado Pago…" : "Sumarme a Premium"}
      </button>
      {error && <p className="text-center text-[13px] text-alerta">{error}</p>}
    </div>
  );
}
