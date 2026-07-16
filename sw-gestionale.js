// Hermosa Home — Service Worker v5 (Network-First)
const CACHE_NAME = 'hermosa-gestionale-v5';
const URLS_TO_CACHE = [
  './',
  './gestionale.html',
  './index.html',
  './manifest.json',
  './manifest-gestionale.json'
];

// Install: cache base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-First strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).then(response => {
      // Cache successful responses
      if(response && response.status === 200 && response.type === 'basic') {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
      }
      return response;
    }).catch(() => {
      // Fallback to cache
      return caches.match(event.request).then(cached => cached || new Response('Offline', { status: 503 }));
    })
  );
});
