const CACHE_NAME = "naroba-shell-v3";
const CACHE_PREFIX = "naroba-shell-";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/naroba-logo.svg", "/nft/nrba-0001.png", "/nft/nrba-0638.png", "/nft/nrba-0771.png", "/nft/nrba-2814.png"];

self.addEventListener("install", (event) => {
  const freshRequests = APP_SHELL.map((url) => new Request(url, { cache: "reload" }));
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(freshRequests)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    })),
  );
});
