"use client";

import { useState, useTransition } from "react";
import { iniciarSuscripcionAlojada } from "@/lib/acciones/membresia";
import { formatearPrecio } from "@/lib/config/premium";

// Prueba en paralelo del OTRO flujo oficial de Mercado Pago:
// "Suscripciones sin plan asociado" + pago pendiente + checkout alojado
// por Mercado Pago (init_point). No reemplaza BotonSuscribirse.tsx (Card
// Form) — convive con él detrás del flag
// NEXT_PUBLIC_MERCADOPAGO_CHECKOUT_ALOJADO_BETA (ver
// app/(app)/membresia/page.tsx). Revertir esta prueba: borrar este
// archivo, el bloque que lo renderiza en /membresia, y la variable de
// entorno del flag — no toca nada del flujo actual.
//
// Acá no hay ningún formulario ni campo de tarjeta: el Server Action
// solo crea el preapproval "pending" y devuelve el `init_point` real de
// Mercado Pago. Todo el ingreso/elección del medio de pago ocurre en
// Mercado Pago — esta app nunca recibe ni tokeniza ninguna tarjeta acá.
// `window.location.assign` (no `router.push`, que es para rutas internas
// de Next) porque el destino es una URL externa, absoluta, a
// mercadopago.com.
//
// `monto` lo calcula el server (montoCheckoutAlojadoBeta en
// lib/mercadopago.ts, ver app/(app)/membresia/page.tsx) — normalmente
// PREMIUM_PLAN.price, pero configurable a un monto de prueba bajo (ej.
// $10) vía la variable server-side MERCADOPAGO_CHECKOUT_ALOJADO_BETA_AMOUNT,
// para poder hacer una transacción real sin pagar el precio completo.
// Es solo para este flujo de prueba: el precio real de Premium (Card
// Form, /membresia) sigue siendo siempre PREMIUM_PLAN.price.
export default function BotonSuscribirseAlojado({ monto }: { monto: number }) {
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
        className="block w-full rounded-full border-2 border-dashed border-marca/40 px-6 py-4 text-center text-[15px] font-semibold text-marca transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Redirigiendo a Mercado Pago…" : `Probar checkout Mercado Pago — ${formatearPrecio(monto)}`}
      </button>
      {error && <p className="text-center text-[13px] text-alerta">{error}</p>}
    </div>
  );
}
