/*
 * Service worker for EZ Quiz Web
 *
 * This service worker caches the core assets of the site, enabling offline
 * functionality. During the install phase, it caches the app shell; during
 * activation it cleans up any old caches. The fetch handler implements a
 * cache‑first strategy with a network fallback, returning the cached index
 * page for navigation requests when offline.
 */

const CACHE_NAME = 'ezquiz-cache-v51';
const RELATIVE_URLS = [
  'index.html',
  'styles.css',
  'app.js',
  // Versioned assets to avoid stale caches on first offline load
  'styles.css?v=1.1.5',
  'app.js?v=1.1.5',
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
  if (event.request.url.includes('/.netlify/functions/')) {
    return; // let network handle serverless calls uncached
  }
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const req = event.request;
    const url = new URL(req.url);
    // Try match with queryless URL for versioned css/js requests
    let alt;
    if (url.search && (url.pathname.endsWith('.css') || url.pathname.endsWith('.js'))) {
      const bareUrl = new URL(url.pathname, self.registration.scope).toString();
      alt = await caches.match(bareUrl);
    }
    const cached = await caches.match(req);
    if (cached) return cached;
    if (alt) return alt;
    try {
      const resp = await fetch(req);
      return resp;
    } catch (e) {
      if (req.mode === 'navigate') {
        const indexUrl = new URL('index.html', self.registration.scope).toString();
        const indexResp = await caches.match(indexUrl);
        if (indexResp) return indexResp;
      }
      throw e;
    }
  })());
});
