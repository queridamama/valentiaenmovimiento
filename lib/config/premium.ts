// Configuración central del plan Premium — un solo lugar para el precio,
// moneda y frecuencia. La UI (/membresia, /perfil) y la integración de
// Mercado Pago (lib/mercadopago.ts) leen de acá; cambiar el precio el día
// de mañana es cambiar estos tres valores, no buscar "$35.000" en 8
// archivos. El plan REAL de Mercado Pago (creado una sola vez con
// scripts/mercadopago/crear-plan.ts) debe coincidir con estos valores —
// si se cambia el precio acá, hay que crear un preapproval_plan nuevo en
// Mercado Pago y actualizar MERCADOPAGO_PREAPPROVAL_PLAN_ID (Mercado Pago
// no permite editar el monto de un plan existente).
export const PREMIUM_PLAN = {
  reason: "Valentía Premium",
  price: 35000,
  currency: "ARS" as const,
  // Mercado Pago: auto_recurring.frequency + frequency_type.
  frequency: 1,
  frequencyType: "months" as const,
} as const;

// `Intl.NumberFormat({style:"currency"})` mete un espacio entre "$" y el
// número ("$ 35.000") que no es el formato que usa el resto de la app —
// se arma a mano para que quede "$35.000", igual que en todo el copy.
export function formatearPrecio(monto: number): string {
  return `$${monto.toLocaleString("es-AR")}`;
}
