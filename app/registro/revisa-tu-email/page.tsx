import Link from "next/link";
import { Titulo, Subtitulo } from "@/components/ui";

export default function RevisaTuEmailPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <Titulo>Revisá tu email</Titulo>
      <Subtitulo>Te mandamos un link para confirmar tu cuenta.</Subtitulo>
      <p className="pt-2 text-sm text-texto/60">
        ¿Ya habías creado tu cuenta?{" "}
        <Link href="/login" className="font-medium text-acento">
          Iniciá sesión
        </Link>
      </p>
    </main>
  );
}
