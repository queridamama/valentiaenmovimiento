"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteBrowser } from "@/lib/supabase/client";
import { Titulo, Subtitulo, BotonPrimario } from "@/components/ui";

// El link del mail de recuperación deja a la usuaria con una sesión de
// recuperación activa en este mismo cliente (Supabase la establece leyendo
// el hash de la URL) — desde acá alcanza con pedir la contraseña nueva.
export default function ActualizarContrasenaPage() {
  const router = useRouter();
  const supabase = crearClienteBrowser();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const { error: errorUpdate } = await supabase.auth.updateUser({ password });
    if (errorUpdate) {
      setError(errorUpdate.message);
      setCargando(false);
      return;
    }
    router.push("/inicio");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div className="space-y-2">
        <Titulo>Elegí tu contraseña nueva</Titulo>
        <Subtitulo>Después de guardarla, vas a entrar directo a la app.</Subtitulo>
      </div>
      <form onSubmit={manejarSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          placeholder="Contraseña nueva"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="rounded-card border border-texto/12 bg-tarjeta px-4 py-3 placeholder:text-texto/35 focus:border-acento focus:outline-none"
        />
        {error && <p className="text-sm text-alerta">{error}</p>}
        <BotonPrimario type="submit" disabled={cargando}>
          {cargando ? "Guardando…" : "Guardar y entrar"}
        </BotonPrimario>
      </form>
    </main>
  );
}
