import type { Config } from "tailwindcss";

// Paleta e identidad visual REALES, tomadas de design-reference/Valentía
// App.dc.html (Claude Design) — ya no son provisorias. Cualquier ajuste de
// marca a futuro pasa por acá, no por colores sueltos en componentes.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fondo: "#F7F6F4",
        tarjeta: "#FFFFFF",
        texto: "#1A1A1A",
        // Color de marca: mismo azul que la landing (#255d78). Protagonista
        // de títulos, navegación y botones principales — reemplaza a
        // acentoTeal, que era un azul/teal muy similar, para que la app se
        // sienta parte de la misma identidad que la landing.
        marca: "#255D78",
        marcaOscuro: "#163B4B",
        acento: "#C49BC9",
        acentoTeal: "#2E6273",
        acentoLima: "#D6DE2B",
        acentoCeleste: "#B9DCE5",
        acentoRosa: "#FBE3E8",
        alerta: "#B85C4A",
      },
      fontFamily: {
        display: ["var(--font-poppins)", "sans-serif"],
        cuerpo: ["var(--font-poppins)", "sans-serif"],
        // Script a mano y marcador grueso — el mismo lenguaje visual manual
        // que la landing, usado con mucha moderación (un acento por bloque).
        script: ["var(--font-caveat)", "cursive"],
        marcador: ["var(--font-marker)", "cursive"],
      },
      borderRadius: {
        card: "1.125rem",
      },
    },
  },
  plugins: [],
};
export default config;
