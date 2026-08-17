// Minimal service worker for Snap Handover.
// Its only job is to satisfy the browser's installability requirement
// (Chrome/Android won't offer "Add to Home Screen" without a registered
// service worker that controls fetches). It does not cache anything --
// every request still goes to the network as normal.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through: just let the network handle every request.
  event.respondWith(fetch(event.request));
});
