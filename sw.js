const CACHE_NAME = 'nexus-host-v3';

// All static assets to pre-cache at install time
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/gym-dashboard.html',
    '/fest-dashboard.html',
    '/restaurant-dashboard.html',
    '/home-dashboard.html',
    '/host-signup-login.html',
    '/css/gym-theme.css',
    '/js/config.js',
    '/nexushostlogo.png',
    '/manifest.json'
];

// ── Install: Pre-cache all static assets ──
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching static assets');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// ── Activate: Remove old caches ──
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

// ── Fetch: Network-first for API, Cache-first for assets ──
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and external requests (Firebase, API backend)
    if (request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            // Return cached version if available
            if (cachedResponse) {
                // In background, fetch a fresh copy and update cache
                fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, networkResponse.clone());
                        });
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            // Not cached – fetch from network and cache it
            return fetch(request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200) {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // Offline fallback
                return caches.match('/gym-dashboard.html');
            });
        })
    );
});
