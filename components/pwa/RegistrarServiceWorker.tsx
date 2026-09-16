"use client";

import { useEffect } from "react";

// Registro puro, sin UI — vive en el layout raíz para que corra en toda
// la app. El service worker en sí no cachea nada (ver public/sw.js).
export default function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
