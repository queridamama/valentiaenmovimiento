"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { crearClienteBrowser } from "@/lib/supabase/client";
import { Titulo, BotonPrimario } from "@/components/ui";

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

    if (data.session) {
      router.push("/inicio");
      router.refresh();
    } else {
      router.push("/registro/revisa-tu-email");
    }
    setCargando(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6">
      <div className="space-y-2">
        <Titulo>Creá tu cuenta</Titulo>
        <p className="text-[15px] text-texto/60">Empezás como Gratis. Podés convertirte en Premium cuando quieras.</p>
      </div>
      <form onSubmit={manejarSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Tu nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="rounded-card border border-texto/12 bg-tarjeta px-4 py-3 placeholder:text-texto/35 focus:border-acento focus:outline-none"
        />
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
          minLength={8}
          className="rounded-card border border-texto/12 bg-tarjeta px-4 py-3 placeholder:text-texto/35 focus:border-acento focus:outline-none"
        />
        {error && <p className="text-sm text-alerta">{error}</p>}
        <BotonPrimario type="submit" disabled={cargando}>
          {cargando ? "Creando cuenta…" : "Crear cuenta"}
        </BotonPrimario>
      </form>
      <p className="text-center text-sm text-texto/60">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-medium text-acento">
          Iniciá sesión
        </Link>
      </p>
    </main>
  );
}
