const CACHE_VERSION = "v1";

const APP_SHELL = [
  "/styles.css",
  "/lion.svg",
  "/lion-maskable.svg",
  "/app-init.js",
  "/theme-init.js",
  "/offline.html",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key !== CACHE_VERSION;
          })
          .map(function (key) {
            return caches.delete(key);
          }),
      );
    }).then(function () {
      return self.clients.claim();
    }),
  );
});

self.addEventListener("fetch", function (event) {
  const url = new URL(event.request.url);

  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        return cached || fetch(event.request);
      }),
    );
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.match("/offline.html");
      }),
    );
    return;
  }
});
