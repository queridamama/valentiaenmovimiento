import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Panel de Admin</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/experiencias" className="rounded-card border border-texto/10 bg-tarjeta p-5">
          <p className="font-medium">Experiencias</p>
          <p className="text-sm text-texto/55">
            Crear, editar, duplicar, publicar y archivar el contenido del recorrido y de las etapas Premium.
          </p>
        </Link>
        <Link href="/admin/usuarias" className="rounded-card border border-texto/10 bg-tarjeta p-5">
          <p className="font-medium">Usuarias</p>
          <p className="text-sm text-texto/55">Ver alumnas y cambiar su nivel (Gratis / Premium) o rol.</p>
        </Link>
      </div>
    </div>
  );
}
