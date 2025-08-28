/*
 * Service worker for EZ Quiz Web
 *
 * This service worker caches the core assets of the site, enabling offline
 * functionality. During the install phase, it caches the app shell; during
 * activation it cleans up any old caches. The fetch handler implements a
 * cache‑first strategy with a network fallback, returning the cached index
 * page for navigation requests when offline.
 */

const CACHE_NAME = 'ezquiz-cache-v26';
const RELATIVE_URLS = [
  'index.html',
  'style.css',
  'app.js',
  'manifest.webmanifest',
  'sw.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/brand-title-source.png',
  'icons/favicon.ico',
  'icons/favicon-16.png',
  'icons/favicon-32.png'
];
const URLS_TO_CACHE = RELATIVE_URLS.map((p) => new URL(p, self.registration.scope).toString());

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            return response;
          })
          .catch(() => {
            // When offline and navigation to non‑cached assets happens, fallback to index
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          })
      );
    })
  );
});
