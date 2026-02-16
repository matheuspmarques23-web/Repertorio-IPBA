/* Basic PWA cache: app shell + offline fallback.
   Obs: Spotify/YouTube/Drive são domínios externos; o SW não “baixa” e não garante offline deles. */

const CACHE_NAME = "ipb-repertorio-pwa-v1";
const APP_SHELL = [
  "./",
  "./repertorio_ipb_player.html",
  "./manifest.webmanifest",
  "./service-worker.js",
  "./icon-192.png",
  "./icon-512.png"
];

// Install: cache do “casco” do app
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: limpa caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())))
    )
  );
  self.clients.claim();
});

// Fetch: strategy
// - Navegação/HTML: network-first (pra pegar updates), fallback no cache
// - Assets do app: cache-first
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Só controlamos o mesmo origin (seu domínio)
  if (url.origin !== self.location.origin) return;

  // HTML / navigation: network-first
  if (req.mode === "navigate" || (req.destination === "document")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("./repertorio_ipb_player.html")))
    );
    return;
  }

  // Outros assets: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      });
    })
  );
});
