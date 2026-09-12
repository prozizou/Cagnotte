// Service worker minimal : condition technique pour qu'un navigateur
// considère l'app "installable" (déclenche beforeinstallprompt) et pour
// que l'icône/le manifest restent disponibles hors connexion. Volontairement
// très prudent : seuls les fichiers statiques ci-dessous passent par le
// cache — jamais les routes /api/*, ni aucune requête vers Firebase/
// Cloudinary, qui doivent toujours être servies en direct (données en
// temps réel, jamais périmées).
const CACHE_NAME = "cagnottepro-shell-v1";
const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (!PRECACHE_URLS.includes(url.pathname)) return;

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
