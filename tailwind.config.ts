import type { Config } from "tailwindcss";

// Paleta y tipografía PROVISORIAS — a reemplazar cuando tengamos las
// referencias de identidad visual de Melisa (ver STATUS.md, Fase 0).
// El objetivo de dejarlo como tokens acá, y no colores sueltos en cada
// componente, es que ese reemplazo sea un cambio en un solo lugar.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fondo: "#FBF8F5",
        texto: "#2B2420",
        acento: "#8B5E4B",
        acentoSuave: "#D9C3B5",
        exito: "#5C7A5A",
        alerta: "#B85C4A",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        cuerpo: ["var(--font-cuerpo)"],
      },
      borderRadius: {
        card: "1rem",
      },
    },
  },
  plugins: [],
};
export default config;
