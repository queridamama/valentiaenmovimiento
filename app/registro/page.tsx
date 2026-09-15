"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteBrowser } from "@/lib/supabase/client";

export default function RegistroPage() {
  const router = useRouter();
  const supabase = crearClienteBrowser();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const { data, error: errorRegistro } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre },
        emailRedirectTo: `${location.origin}/auth/confirm?next=/inicio`,
      },
    });

    if (errorRegistro) {
      setError(errorRegistro.message);
      setCargando(false);
      return;
    }

    // La fila en `perfiles`/`autorizaciones` la crea un trigger en la base
    // (ver supabase/schema.sql) — no se duplica esa lógica acá.
    //
    // Según la configuración del proyecto Supabase ("Confirm email"), signUp
    // puede devolver sesión activa de una, o puede requerir que la usuaria
    // confirme el mail antes de poder loguearse. Distinguimos por la
    // presencia de `data.session`, en vez de asumir un solo caso — si no,
    // la usuaria queda redirigida a /inicio y rebota a /login sin entender
    // por qué.
    if (data.session) {
      router.push("/inicio");
      router.refresh();
    } else {
      router.push("/registro/revisa-tu-email");
    }
    setCargando(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="font-display text-2xl">Creá tu cuenta</h1>
      <form onSubmit={manejarSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Tu nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="rounded-card border border-acentoSuave px-4 py-3"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-card border border-acentoSuave px-4 py-3"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="rounded-card border border-acentoSuave px-4 py-3"
        />
        {error && <p className="text-sm text-alerta">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="rounded-card bg-acento px-6 py-3 text-fondo disabled:opacity-60"
        >
          {cargando ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
    </main>
  );
}
