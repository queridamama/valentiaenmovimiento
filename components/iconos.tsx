// Set chico de iconos de línea, dibujados a mano, para usar SIEMPRE dentro
// de IconoPastel (círculo de color pastel de fondo). No son decoración
// suelta: cada pantalla los cicla por índice o los elige por estado real,
// nunca por un significado inventado que no podamos garantizar (los
// títulos de experiencias son contenido de CMS, no un enum fijo).
export type TipoIcono =
  | "estrella"
  | "corazon"
  | "montana"
  | "documento"
  | "chat"
  | "gente"
  | "calendario"
  | "pasos"
  | "corona"
  | "libro";

function Trazo({ children, tamano }: { children: React.ReactNode; tamano: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function Icono({ tipo, tamano }: { tipo: TipoIcono; tamano: number }) {
  switch (tipo) {
    case "estrella":
      return (
        <Trazo tamano={tamano}>
          <path d="M12 3.5 14.2 9l6 .6-4.5 4 1.3 5.9L12 16.6l-5 2.9 1.3-5.9-4.5-4 6-.6Z" />
        </Trazo>
      );
    case "corazon":
      return (
        <Trazo tamano={tamano}>
          <path d="M12 20.5C4 15 2.5 11 2.5 7.8 2.5 5 4.7 3 7.3 3c1.9 0 3.6 1.1 4.7 2.9C13.1 4.1 14.8 3 16.7 3c2.6 0 4.8 2 4.8 4.8 0 3.2-1.5 7.2-9.5 12.7Z" />
        </Trazo>
      );
    case "montana":
      return (
        <Trazo tamano={tamano}>
          <path d="M3 18.5 9 8l4 6.2 2.2-3L20.5 18.5Z" />
          <path d="M15 6.5v5M15 6.5l2.2 1.4M15 6.5l-2 1.2" />
        </Trazo>
      );
    case "documento":
      return (
        <Trazo tamano={tamano}>
          <path d="M7 3.5h7l4 4v12.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
          <path d="M14 3.5v4h4" />
          <path d="M9 14.3c1.2-1 2.8-1 4 0M11 12.8v3" />
        </Trazo>
      );
    case "chat":
      return (
        <Trazo tamano={tamano}>
          <path d="M4 5.5h16v10.5H9.5L5 20V16H4z" />
        </Trazo>
      );
    case "gente":
      return (
        <Trazo tamano={tamano}>
          <circle cx="9" cy="9" r="3" />
          <path d="M3.5 19c.6-3 2.7-4.5 5.5-4.5s4.9 1.5 5.5 4.5" />
          <circle cx="17" cy="8" r="2.3" />
          <path d="M15.5 14.2c2.2.2 3.7 1.6 4.2 3.8" />
        </Trazo>
      );
    case "calendario":
      return (
        <Trazo tamano={tamano}>
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
        </Trazo>
      );
    case "pasos":
      return (
        <Trazo tamano={tamano}>
          <path d="M6 20c0-3 2-6 2-9 0-1.5-1-2-1-2" />
          <path d="M17 4c0 3-2 6-2 9 0 1.5 1 2 1 2" />
          <circle cx="7.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
        </Trazo>
      );
    case "corona":
      return (
        <Trazo tamano={tamano}>
          <path d="M4 17.5 3 8l5 4 4-6.5 4 6.5 5-4-1 9.5Z" />
          <path d="M4 17.5h16" />
        </Trazo>
      );
    case "libro":
      return (
        <Trazo tamano={tamano}>
          <path d="M12 6.5c-1.6-1.3-3.6-2-6-2v13c2.4 0 4.4.7 6 2 1.6-1.3 3.6-2 6-2v-13c-2.4 0-4.4.7-6 2Z" />
          <path d="M12 6.5v13" />
        </Trazo>
      );
  }
}

const FONDOS: Record<string, string> = {
  lila: "bg-acento/25 text-marca",
  celeste: "bg-acentoCeleste/45 text-marca",
  rosa: "bg-acentoRosa text-marca",
  lima: "bg-acentoLima/45 text-marca",
  marca: "bg-marca/12 text-marca",
  blanco: "bg-white text-marca",
};

// El círculo pastel con el icono adentro — la unidad visual más repetida
// del sistema (reemplaza los emoji y los iconos sueltos sin fondo).
export function IconoPastel({
  tipo,
  color = "lila",
  tamano = "chico",
  className = "",
}: {
  tipo: TipoIcono;
  color?: keyof typeof FONDOS;
  tamano?: "chico" | "grande";
  className?: string;
}) {
  const caja = tamano === "grande" ? "h-14 w-14" : "h-10 w-10";
  const icono = tamano === "grande" ? 26 : 19;
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full ${caja} ${FONDOS[color]} ${className}`}>
      <Icono tipo={tipo} tamano={icono} />
    </span>
  );
}
