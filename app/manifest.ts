import type { MetadataRoute } from "next";

// Manifest real de instalación. Los íconos salen de public/iso.png (el
// isotipo cuadrado real) — ver PWA.md para cómo se generaron los 4
// tamaños en public/icons/.
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
