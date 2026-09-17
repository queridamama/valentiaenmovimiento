// Crea el plan mensual único de "Valentía Premium" en Mercado Pago
// (POST /preapproval_plan). Se corre UNA sola vez, a mano, desde una
// máquina con el ACCESS TOKEN real de la cuenta de Mercado Pago — nunca
// desde este entorno de desarrollo, que no tiene credenciales reales.
//
// Uso:
//   MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx NEXT_PUBLIC_APP_URL=https://valentiaenmovimiento.vercel.app \
//     npx tsx scripts/mercadopago/crear-plan.ts
//
// O, con un .env.local que ya tenga esas dos variables:
//   npx tsx scripts/mercadopago/crear-plan.ts
//
// Sin MERCADOPAGO_ACCESS_TOKEN configurado, el script no hace ningún
// pedido de red: solo explica qué falta y termina.
//
// El id que devuelve ("id": "...") es el que hay que guardar como
// MERCADOPAGO_PREAPPROVAL_PLAN_ID (en Vercel y en .env.local) — se crea
// una sola vez porque Mercado Pago no permite cambiar el monto de un
// plan ya creado: si el precio cambia, se corre este script de nuevo
// para crear un plan nuevo y se actualiza esa variable.
//
// No importa nada de lib/ a propósito: varios módulos de lib/ usan
// "server-only", que tira error fuera del bundler de Next.js (ver
// node_modules/server-only/index.js) — este script se mantiene
// standalone, igual que scripts/importar-wordpress.ts.

import "dotenv/config";

const PREMIUM_PLAN = {
  reason: "Valentía Premium",
  price: 35000,
  currency: "ARS",
  frequency: 1,
  frequencyType: "months",
};

async function main() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    console.log(
      [
        "Falta MERCADOPAGO_ACCESS_TOKEN — no se hizo ningún pedido de red.",
        "",
        "Para crear el plan de verdad:",
        "  1. Conseguir el ACCESS TOKEN de la cuenta de Mercado Pago (de prueba o real)",
        "     desde https://www.mercadopago.com.ar/developers/panel/app",
        "  2. Correr:",
        "     MERCADOPAGO_ACCESS_TOKEN=... NEXT_PUBLIC_APP_URL=https://valentiaenmovimiento.vercel.app \\",
        "       npx tsx scripts/mercadopago/crear-plan.ts",
      ].join("\n")
    );
    return;
  }

  const backUrl = `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/membresia/resultado`;

  const cuerpo = {
    reason: PREMIUM_PLAN.reason,
    back_url: backUrl,
    auto_recurring: {
      frequency: PREMIUM_PLAN.frequency,
      frequency_type: PREMIUM_PLAN.frequencyType,
      transaction_amount: PREMIUM_PLAN.price,
      currency_id: PREMIUM_PLAN.currency,
    },
  };

  console.log("Creando preapproval_plan con:", JSON.stringify(cuerpo, null, 2));

  const res = await fetch("https://api.mercadopago.com/preapproval_plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(cuerpo),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`Mercado Pago respondió ${res.status}:`, data);
    process.exitCode = 1;
    return;
  }

  console.log("\nPlan creado. Guardar este id como MERCADOPAGO_PREAPPROVAL_PLAN_ID:\n");
  console.log(`  MERCADOPAGO_PREAPPROVAL_PLAN_ID=${data.id}`);
  console.log("\nRespuesta completa de Mercado Pago:");
  console.log(JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
