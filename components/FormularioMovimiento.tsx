"use client";

import { useActionState } from "react";
import { guardarMovimiento, type EstadoGuardarMovimiento } from "@/lib/acciones/movimiento";
import { BotonPrimario, Campo } from "@/components/ui";

const ESTADO_INICIAL: EstadoGuardarMovimiento = { error: null };

// Igual que el resto de la app: un error se muestra como texto en línea
// (mismo estilo que login/registro), no rompe la página. Ver
// supabase/migrations/0003_fix_movimientos.sql para la causa de fondo que
// esto también cubre del lado del cliente.
export default function FormularioMovimiento({
  descripcionInicial,
  enCurso,
}: {
  descripcionInicial: string;
  enCurso: boolean;
}) {
  const [estado, accion, enviando] = useActionState(guardarMovimiento, ESTADO_INICIAL);

  return (
    <form action={accion} className="space-y-3">
      <Campo
        label="Mi movimiento"
        name="descripcion"
        defaultValue={descripcionInicial}
        placeholder="¿Qué vas a hacer esta semana?"
        rows={3}
        required
      />
      {estado.error && <p className="text-sm text-alerta">{estado.error}</p>}
      <BotonPrimario type="submit" disabled={enviando}>
        {enviando ? "Guardando…" : enCurso ? "Guardar cambios" : "Confirmar mi movimiento"}
      </BotonPrimario>
    </form>
  );
}
