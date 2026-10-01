/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // El límite por default de Next para el body de un Server Action es
  // 1 MB — mucho menos que lo que ya permitíamos subir en
  // lib/acciones/almacenamiento.ts (PDF hasta 20MB, audio hasta 30MB).
  // Causa confirmada por los runtime logs de Vercel del incidente de
  // Production (2026-09-30, 00:41/00:44 UTC): "Body exceeded 1 MB limit"
  // / 413 al subir un PDF desde /admin/experiencias/[id] — no tenía nada
  // que ver con Supabase ni con el schema cache. 32mb deja margen sobre
  // el máximo real (30MB de audio) sin abrir la puerta a archivos
  // arbitrariamente grandes.
  experimental: {
    serverActions: {
      bodySizeLimit: "32mb",
    },
  },
};

module.exports = nextConfig;
