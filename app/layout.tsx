import type { Metadata, Viewport } from "next";
import { Poppins, Caveat, Permanent_Marker } from "next/font/google";
import RegistrarServiceWorker from "@/components/pwa/RegistrarServiceWorker";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

// Script a mano y marcador grueso — mismas fuentes que la landing, para un
// par de acentos manuscritos muy puntuales (ver Doodle/Marcador/Subrayado
// en components/ui.tsx). No reemplazan a Poppins como tipografía de uso.
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-caveat",
});

const marker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marker",
});

export const metadata: Metadata = {
  title: "Valentía en Movimiento",
  description: "Tomate tus sueños en serio.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Valentía",
  },
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

// themeColor va acá (no en `metadata`) desde Next 14 — ver
// generateViewport en la doc del proyecto.
export const viewport: Viewport = {
  themeColor: "#255D78",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${poppins.variable} ${caveat.variable} ${marker.variable}`}>
      <body className="min-h-screen">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
