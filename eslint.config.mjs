import nextConfig from "eslint-config-next";

// design-reference/ es el export de Claude Design (referencia visual, no
// código de la app) — no tiene sentido lintearlo con las reglas de Next.
const config = [{ ignores: ["design-reference/**"] }, ...nextConfig];

export default config;
