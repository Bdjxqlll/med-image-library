// Service Worker for MedImageLibrary PWA
const CACHE_NAME = 'med-image-library-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

// Install
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch - cache first, network fallback
self.addEventListener('fetch', (e) => {
  // Skip non-GET
  if (e.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http
  if (!e.request.url.startsWith('http')) return;

  // CDN resources - network first, cache fallback
  if (e.request.url.includes('cdnjs.cloudflare.com') ||
      e.request.url.includes('cdn.jsdelivr.net') ||
      e.request.url.includes('fonts.googleapis.com')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Local assets - cache first
  e.respondWith(
    caches.match(e.request).then(res => {
      if (res) return res;
      return fetch(e.request).then(fetchRes => {
        // Cache successful responses
        if (fetchRes && fetchRes.status === 200) {
          const clone = fetchRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return fetchRes;
      }).catch(() => {
        // Offline fallback for navigation
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
