"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { crearClienteBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = crearClienteBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const { error: errorLogin } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (errorLogin) {
      // Supabase distingue credenciales inválidas de email sin confirmar
      // (error.code === "email_not_confirmed"); mostrar ese caso aparte
      // evita que parezca una contraseña mal tipeada cuando en realidad
      // falta abrir el link del mail.
      if (errorLogin.code === "email_not_confirmed") {
        setError("Todavía no confirmaste tu email. Revisá tu bandeja de entrada.");
      } else {
        setError("Email o contraseña incorrectos.");
      }
      setCargando(false);
      return;
    }

    const destino = searchParams.get("redirect") ?? "/inicio";
    router.push(destino);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="font-display text-2xl">Iniciar sesión</h1>
      <form onSubmit={manejarSubmit} className="flex flex-col gap-4">
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
          className="rounded-card border border-acentoSuave px-4 py-3"
        />
        {error && <p className="text-sm text-alerta">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="rounded-card bg-acento px-6 py-3 text-fondo disabled:opacity-60"
        >
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
