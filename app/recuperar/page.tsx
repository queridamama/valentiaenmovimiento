"use client";

import { useState } from "react";
import Link from "next/link";
import { crearClienteBrowser } from "@/lib/supabase/client";
import { urlApp } from "@/lib/url";
import { Titulo, Subtitulo, BotonPrimario } from "@/components/ui";

export default function RecuperarPage() {
  const supabase = crearClienteBrowser();
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${urlApp()}/actualizar-contrasena`,
    });
    // Siempre mostramos el mismo mensaje, exista o no esa cuenta — no hay
    // forma de confirmar un email registrado sin filtrar esa información.
    setEnviado(true);
    setCargando(false);
  }

  if (enviado) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <Titulo>Revisá tu email</Titulo>
        <Subtitulo>Si esa cuenta existe, te mandamos un link para elegir una contraseña nueva.</Subtitulo>
        <Link href="/login" className="text-sm font-medium text-acento">
          ← Volver a iniciar sesión
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div className="space-y-2">
        <Titulo>Recuperar acceso</Titulo>
        <Subtitulo>Te mandamos un link para elegir una contraseña nueva.</Subtitulo>
      </div>
      <form onSubmit={manejarSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-card border border-texto/12 bg-tarjeta px-4 py-3 placeholder:text-texto/35 focus:border-acento focus:outline-none"
        />
        <BotonPrimario type="submit" disabled={cargando}>
          {cargando ? "Enviando…" : "Mandarme el link"}
        </BotonPrimario>
      </form>
      <Link href="/login" className="text-center text-sm font-medium text-acento">
        ← Volver a iniciar sesión
      </Link>
    </main>
  );
}
