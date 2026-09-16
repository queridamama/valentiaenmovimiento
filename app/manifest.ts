import type { MetadataRoute } from "next";

// Manifest real de instalación. Los 3 íconos de acá abajo todavía no
// existen como archivo (ver PWA.md) — quedan declarados con su path final
// para que alcance con soltar los PNG en public/icons/ sin tocar más
// código, pero hasta que existan la instalación en Android queda
// degradada (Chrome no dispara `beforeinstallprompt` si no puede
// resolver los íconos del manifest).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Valentía en Movimiento",
    short_name: "Valentía",
    description: "Tomate tus sueños en serio.",
    start_url: "/inicio",
    display: "standalone",
    background_color: "#F7F6F4",
    theme_color: "#255D78",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
