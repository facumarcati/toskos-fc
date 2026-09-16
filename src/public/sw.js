// sw.js - Service Worker básico para TSK Fútbol
const CACHE_NAME = "tsk-cache-v1";

// Recursos base que se guardan para que la app abra rápido / offline
const PRECACHE_URLS = [
  "/",
  "/css/styles.css",
  "/img/escudo-tsk.png",
  "/img/icons/icon-192.png",
  "/img/icons/icon-512.png",
];

// Al instalar el SW, precachea los recursos base
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

// Limpia caches viejos cuando se activa una nueva versión
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// Estrategia: intenta la red primero, si falla usa el cache (útil para páginas dinámicas)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
