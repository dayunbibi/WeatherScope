const CACHE_VERSION = "weatherscope-v1";

const APP_SHELL_CACHE = `${CACHE_VERSION}-app-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL_FILES = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/css/style.css",
  "/js/main.js",
  "/js/api.js",
  "/js/autocomplete.js",
  "/js/map.js",
  "/js/models.js",
  "/js/storage.js",
  "/js/ui.js",
  "/images/icon-192.png",
  "/images/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const validCaches = new Set([
    APP_SHELL_CACHE,
    RUNTIME_CACHE,
  ]);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) => !validCaches.has(cacheName)
            )
            .map((cacheName) =>
              caches.delete(cacheName)
            )
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    event.respondWith(networkOnly(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationStrategy(request));
    return;
  }

  if (requestUrl.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(
      JSON.stringify({
        message:
          "You appear to be offline. Weather data cannot be updated.",
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

async function navigationStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, networkResponse.clone());

    return networkResponse;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match("/offline.html"))
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);

  const networkRequest = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    })
    .catch(() => null);

  return cachedResponse || networkRequest;
}