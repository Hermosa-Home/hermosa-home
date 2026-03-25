// Service Worker per Hermosa Home Gestionale
const CACHE_NAME = 'hh-gestionale-v1';
const urlsToCache = [
  '/hermosa-home/gestionale.html',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Installazione
self.addEventListener('install', event => {
  console.log('SW Gestionale: Installazione');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Cache aperta');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('SW: Errore cache', err))
  );
  self.skipWaiting();
});

// Attivazione
self.addEventListener('activate', event => {
  console.log('SW Gestionale: Attivazione');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('SW: Rimozione vecchia cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - strategia network first con fallback cache
self.addEventListener('fetch', event => {
  // Ignora richieste non GET
  if (event.request.method !== 'GET') return;
  
  // Per le API e richieste dinamiche, usa network first
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('analytics') ||
      event.request.url.includes('googleapis')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clona la risposta per la cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Fallback alla cache
        return caches.match(event.request).then(response => {
          if (response) return response;
          // Se la pagina non è in cache, restituisci la pagina principale
          if (event.request.destination === 'document') {
            return caches.match('/hermosa-home/gestionale.html');
          }
          return new Response('Offline - Hermosa Home', { status: 503 });
        });
      })
  );
});

// Notifiche push (placeholder per futuro)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Hermosa Home';
  const options = {
    body: data.body || 'Nuova notifica dal gestionale',
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"%3E%3Crect width="512" height="512" rx="80" fill="%232C2416"/%3E%3Ctext x="256" y="360" text-anchor="middle" font-size="44" fill="%23C4956A" font-family="Georgia,serif"%3EHH%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"%3E%3Crect width="512" height="512" rx="80" fill="%232C2416"/%3E%3C/svg%3E'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Gestione click su notifica
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/hermosa-home/gestionale.html')
  );
});