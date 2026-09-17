"use client";

import { useState, useTransition } from "react";
import { iniciarSuscripcion } from "@/lib/acciones/membresia";

// CTA de compra de /membresia. Server Action, no <form action=...>: acá
// hace falta leer el resultado (la URL de Mercado Pago o un error) antes
// de decidir qué hacer, no solo disparar y redirigir con un submit común.
// El botón se deshabilita apenas se toca (estado `pending`), que es la
// defensa del lado del cliente contra el doble click — la real, la que
// importa de verdad, es server-side (ver iniciarSuscripcion en
// lib/acciones/membresia.ts, que revisa si ya existe una suscripción
// antes de crear una nueva).
export default function BotonSuscribirse() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const resultado = await iniciarSuscripcion();
      if ("error" in resultado) {
        setError(resultado.error);
        return;
      }
      window.location.href = resultado.url;
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="block w-full rounded-full bg-marca px-6 py-4 text-center text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Redirigiendo a Mercado Pago…" : "Sumarme a Premium"}
      </button>
      {error && <p className="text-center text-[13px] text-alerta">{error}</p>}
    </div>
  );
}
