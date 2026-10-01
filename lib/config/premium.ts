// Configuración central del plan Premium — un solo lugar para el precio,
// moneda y frecuencia. La UI (/membresia, /perfil) y la integración de
// Mercado Pago (lib/mercadopago.ts) leen de acá; cambiar el precio el día
// de mañana es cambiar estos tres valores, no buscar el precio viejo en 8
// archivos. El checkout REAL que usa /membresia es el flujo alojado sin
// plan asociado (crearPreapprovalSinPlan), así que toma este monto en cada
// alta nueva. El preapproval_plan histórico queda solo como camino de
// rollback del Card Form y no define el precio del checkout actual.
export const PREMIUM_PLAN = {
  reason: "Valentía Premium",
  price: 35000,
  currency: "ARS" as const,
  // Mercado Pago: auto_recurring.frequency + frequency_type.
  frequency: 1,
  frequencyType: "months" as const,
} as const;

// Precio promocional semestral de esta etapa de prueba.
// El equivalente es $25.000 por mes durante 6 meses = $150.000 total.
// El checkout semestral se gestiona por separado del débito mensual.
export const PREMIUM_SEMESTRAL = {
  months: 6,
  monthlyEquivalent: 25000,
  totalPrice: 150000,
  currency: "ARS" as const,
} as const;

// `Intl.NumberFormat({style:"currency"})` mete un espacio entre "$" y el
// número; se arma a mano para que quede "$35.000", igual que en el resto
// del copy de la app.
export function formatearPrecio(monto: number): string {
  return `$${monto.toLocaleString("es-AR")}`;
}
