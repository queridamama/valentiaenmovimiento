import Link from "next/link";

const SECCIONES = [
  { href: "/admin/experiencias", titulo: "Experiencias", texto: "El recorrido de Mi Sueño y las clases de cada etapa Premium." },
  { href: "/admin/biblioteca", titulo: "Biblioteca", texto: "Clases, meditaciones, audios, plantillas, recursos y talleres grabados." },
  { href: "/admin/cursos", titulo: "Cursos", texto: "Cursos con sus módulos, armados con contenidos de la Biblioteca." },
  { href: "/admin/comunidad", titulo: "Comunidad · Meli", texto: "Publicaciones tuyas en la categoría Meli." },
  { href: "/admin/eventos", titulo: "Eventos", texto: "Talleres mensuales y laboratorios de movimiento." },
  { href: "/admin/usuarias", titulo: "Usuarias", texto: "Ver alumnas y cambiar su nivel (Gratis / Premium) o rol." },
];

export default function AdminHomePage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Panel de Admin</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {SECCIONES.map((s) => (
          <Link key={s.href} href={s.href} className="rounded-card border border-texto/10 bg-tarjeta p-5">
            <p className="font-medium">{s.titulo}</p>
            <p className="text-sm text-texto/55">{s.texto}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
