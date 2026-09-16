// Service worker mínimo — existe solo para que el navegador considere la
// app instalable. A propósito NO cachea nada ni intercepta requests: la
// app usa Supabase Auth con cookies y datos que cambian todo el tiempo, y
// un service worker "de caché" mal escrito es la forma más común de
// terminar sirviendo una sesión vieja o contenido stale. Si en el futuro
// se agrega cache real, hacerlo con cuidado (nunca cachear rutas
// autenticadas ni llamadas a Supabase).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
