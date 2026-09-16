// Acentos dibujados a mano, muy puntuales (máximo uno por bloque, ver
// brief de identidad visual). Solo dos tipos a propósito — esto no es
// decoración de fondo, es un detalle ocasional.
export default function Doodle({
  tipo,
  color = "currentColor",
  className = "",
}: {
  tipo: "garabato" | "corazon";
  color?: string;
  className?: string;
}) {
  if (tipo === "corazon") {
    return (
      <svg viewBox="0 0 32 28" className={className} aria-hidden="true">
        <path
          d="M16 25C6 18 2 13 2 8.5 2 4.5 5 2 8.5 2c2.6 0 4.8 1.6 5.9 3.9C15.7 3.6 17.9 2 20.5 2 24 2 27 4.5 27 8.5c0 4.5-4 9.5-14 16.5Z"
          fill={color}
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 220 24" preserveAspectRatio="none" className={className} fill="none" aria-hidden="true">
      <path
        d="M2 14c14-13 24 10 38 2 12-7 20 9 34 3 13-6 22 9 36 2 13-6 22 9 36 2 13-6 22 9 36 2 5-2 8-3 10-5"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
