"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { crearClienteBrowser } from "@/lib/supabase/client";
import { Titulo, BotonPrimario } from "@/components/ui";

function FormularioLogin() {
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

    const { error: errorLogin } = await supabase.auth.signInWithPassword({ email, password });

    if (errorLogin) {
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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6">
      <Titulo>Iniciar sesión</Titulo>
      <form onSubmit={manejarSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-card border border-texto/12 bg-tarjeta px-4 py-3 placeholder:text-texto/35 focus:border-acento focus:outline-none"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded-card border border-texto/12 bg-tarjeta px-4 py-3 placeholder:text-texto/35 focus:border-acento focus:outline-none"
        />
        {error && <p className="text-sm text-alerta">{error}</p>}
        <BotonPrimario type="submit" disabled={cargando}>
          {cargando ? "Entrando…" : "Entrar"}
        </BotonPrimario>
      </form>
      <div className="space-y-2 text-center text-sm text-texto/60">
        <p>
          <Link href="/recuperar" className="font-medium text-acento">
            Olvidé mi contraseña
          </Link>
        </p>
        <p>
          ¿Todavía no tenés cuenta?{" "}
          <Link href="/registro" className="font-medium text-acento">
            Creala acá
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <FormularioLogin />
    </Suspense>
  );
}
