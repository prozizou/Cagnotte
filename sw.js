/* Service Worker — Cagnotte HLM 2 (PWA) */
const CACHE_VERSION = 'cagnotte-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './banner.jpg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.1/firebase-database-compat.js'
];

// ---- Installation : pré-cache de la coquille applicative ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => {/* CDN indisponible : on continue */})
    ).then(() => self.skipWaiting())
  );
});

// ---- Activation : nettoyage des anciens caches ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ---- Stratégie de récupération ----
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // On ne traite que les requêtes GET
  if (req.method !== 'GET') return;

  // Firebase Realtime Database (temps réel) : toujours le réseau, jamais de cache
  if (url.hostname.endsWith('firebaseio.com') ||
      url.hostname.endsWith('firebasedatabase.app') ||
      url.hostname.includes('google') && url.pathname.includes('/.lp')) {
    return; // laisse passer vers le réseau
  }

  // Navigation (HTML) : réseau d'abord, cache en secours (mode hors-ligne)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Autres ressources : cache d'abord, réseau en secours
  event.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        if (res && res.status === 200 && (url.origin === self.location.origin ||
            url.hostname === 'www.gstatic.com')) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached)
    )
  );
});
