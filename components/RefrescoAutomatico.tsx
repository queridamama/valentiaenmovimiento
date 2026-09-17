"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Vuelve a pedir la página (Server Component) cada `segundos`, para que
// /membresia/resultado se actualice sola cuando el webhook de Mercado
// Pago termine de confirmar — sin esto, la usuaria vería "Procesando"
// para siempre hasta refrescar a mano.
export default function RefrescoAutomatico({ segundos = 4 }: { segundos?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(id);
  }, [router, segundos]);

  return null;
}
