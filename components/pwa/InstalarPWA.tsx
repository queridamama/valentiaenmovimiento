"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// `beforeinstallprompt`/`appinstalled` no están en el lib.dom.d.ts de
// TypeScript — se declaran acá para no repetir un `as any` en cada uso.
interface EventoInstalacionPWA extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: EventoInstalacionPWA;
  }
}

function esIOS() {
  const ua = window.navigator.userAgent;
  const esIOSClasico = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ se anuncia como "Mac" en el user agent salvo por esto.
  const esIPadDisfrazadoDeMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return esIOSClasico || esIPadDisfrazadoDeMac;
}

function esStandalone() {
  const enStandalone = window.matchMedia("(display-mode: standalone)").matches;
  // Propiedad no estándar que expone Safari/iOS en vez del media query.
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return enStandalone || iosStandalone;
}

// El user agent no cambia en la vida de la pestaña — no hace falta una
// suscripción real, pero se pasa por `useSyncExternalStore` igual para
// tener un valor seguro en el render de servidor (nunca leer `navigator`
// ahí) sin caer en un `setState` síncrono adentro de un efecto.
function sinSuscripcion() {
  return () => {};
}

function useEsIOS() {
  return useSyncExternalStore(sinSuscripcion, esIOS, () => false);
}

function suscribirStandalone(notificar: () => void) {
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", notificar);
  return () => mql.removeEventListener("change", notificar);
}

function useEsStandalone() {
  // Server snapshot = `true` (bloque oculto) para no parpadear la
  // invitación en una sesión que ya corre instalada.
  return useSyncExternalStore(suscribirStandalone, esStandalone, () => true);
}

export default function InstalarPWA() {
  const enStandalone = useEsStandalone();
  const iOS = useEsIOS();
  const [prompt, setPrompt] = useState<EventoInstalacionPWA | null>(null);
  const [instaladaEnEstaSesion, setInstaladaEnEstaSesion] = useState(false);
  const [mostrarInstructivoIOS, setMostrarInstructivoIOS] = useState(false);

  // Estos dos listeners solo hacen lo que un efecto debe hacer: suscribirse
  // a un evento externo y llamar a `setState` desde el callback cuando ese
  // evento ocurre — nunca de forma síncrona en el cuerpo del efecto.
  useEffect(() => {
    const alDetectarPrompt = (e: EventoInstalacionPWA) => {
      e.preventDefault();
      setPrompt(e);
    };
    const alInstalar = () => {
      setInstaladaEnEstaSesion(true);
      setPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", alDetectarPrompt);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", alDetectarPrompt);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  if (enStandalone || instaladaEnEstaSesion) return null;
  // Sin prompt nativo (Android/Chrome) y sin ser iOS: el navegador no da
  // ninguna vía real de instalación — mejor no mostrar una invitación que
  // no lleva a ningún lado.
  if (!prompt && !iOS) return null;

  async function instalar() {
    if (prompt) {
      await prompt.prompt();
      const eleccion = await prompt.userChoice;
      if (eleccion.outcome === "accepted") setInstaladaEnEstaSesion(true);
      setPrompt(null);
      return;
    }
    setMostrarInstructivoIOS(true);
  }

  return (
    <>
      <div className="space-y-2 rounded-[22px] bg-texto/6 p-5">
        <p className="text-[14px] font-bold text-marca">Llevá Valentía con vos</p>
        <p className="text-[13px] leading-relaxed text-texto/60">
          Agregala a la pantalla de inicio de tu celular para entrar más rápido.
        </p>
        <button
          type="button"
          onClick={instalar}
          className="rounded-full bg-marca px-5 py-2.5 text-[13px] font-semibold text-white"
        >
          Agregar Valentía a mi inicio
        </button>
      </div>

      {mostrarInstructivoIOS && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-texto/40 px-5 pb-8 sm:items-center"
          onClick={() => setMostrarInstructivoIOS(false)}
        >
          <div className="w-full max-w-sm space-y-4 rounded-[24px] bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-marca">Para agregar Valentía a tu inicio</p>
            <ol className="space-y-2 text-[13.5px] leading-relaxed text-texto/75">
              <li>1. Abrí esta página en Safari.</li>
              <li>2. Tocá el botón Compartir.</li>
              <li>3. Elegí &ldquo;Agregar a pantalla de inicio&rdquo;.</li>
            </ol>
            <button
              type="button"
              onClick={() => setMostrarInstructivoIOS(false)}
              className="w-full rounded-full bg-marca/10 px-5 py-2.5 text-center text-[13px] font-semibold text-marca"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
