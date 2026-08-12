// Our Home — minimal service worker (build spec §51, §52).
// Goal: installability + a graceful offline shell. NOT full offline sync.
const CACHE = "our-home-v1";
const ASSETS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Page navigations: network-first, fall back to a friendly offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html")),
    );
    return;
  }

  // Static shell assets: cache-first.
  if (ASSETS.includes(url.pathname) || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
  }
});
