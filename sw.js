// Hermosa Home PWA - Service Worker
// Versione cache - aggiornare ad ogni deploy
const CACHE_NAME = 'hermosa-home-v1';
const OFFLINE_URL = '/hermosa-home/';

// File da cachare per uso offline
const ASSETS_TO_CACHE = [
  '/hermosa-home/',
  '/hermosa-home/index.html',
  '/hermosa-home/manifest.json',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap'
];

// ── INSTALL: cache risorse principali ──
self.addEventListener('install', function(event) {
  console.log('[SW] Installing Hermosa Home v1...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE.map(function(url) {
        return new Request(url, { mode: 'no-cors' });
      })).catch(function(err) {
        console.log('[SW] Cache error (non-critical):', err);
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: pulisci vecchie cache ──
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// ── FETCH: network-first con fallback cache ──
self.addEventListener('fetch', function(event) {
  // Ignora richieste non-GET
  if (event.request.method !== 'GET') return;

  // Ignora richieste cross-origin non essenziali
  if (!event.request.url.startsWith(self.location.origin) &&
      !event.request.url.includes('fonts.googleapis.com') &&
      !event.request.url.includes('fonts.gstatic.com')) {
    return;
  }

  event.respondWith(
    // Prova prima la rete
    fetch(event.request).then(function(response) {
      // Salva in cache se risposta valida
      if (response && response.status === 200) {
        var responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
      }
      return response;
    }).catch(function() {
      // Rete non disponibile - usa cache
      return caches.match(event.request).then(function(cachedResponse) {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', event.request.url);
          return cachedResponse;
        }
        // Fallback alla pagina principale
        return caches.match(OFFLINE_URL);
      });
    })
  );
});

// ── PUSH NOTIFICATIONS (futuro) ──
self.addEventListener('push', function(event) {
  if (!event.data) return;
  var data = event.data.json();
  var options = {
    body: data.body || 'Hermosa Home',
    icon: '/hermosa-home/icons/icon-192.png',
    badge: '/hermosa-home/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/hermosa-home/' }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Hermosa Home', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

console.log('[SW] Hermosa Home Service Worker loaded ✓');
