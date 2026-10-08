const STATIC_CACHE = "youth-ministries-static-v1";
const STATIC_CACHE_PREFIX = "youth-ministries-static-";
const OFFLINE_FALLBACK = "/offline.html";

const PRECACHE_ASSETS = [
  OFFLINE_FALLBACK,
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-512x512-maskable.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(STATIC_CACHE_PREFIX) &&
                cacheName !== STATIC_CACHE,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isExplicitStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (PRECACHE_ASSETS.includes(url.pathname) ||
      url.pathname.startsWith("/_next/static/"))
  );
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const fallback = await caches.match(OFFLINE_FALLBACK);
    return fallback || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    event.respondWith(fetch(request));
    return;
  }

  // All cross-origin traffic (including Supabase) and same-origin API calls
  // remain network-only and are never written to Cache Storage.
  if (
    url.origin !== self.location.origin ||
    url.pathname === "/api" ||
    url.pathname.startsWith("/api/")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigation responses can contain authenticated ministry information.
  // Never cache them; use only the fixed, data-free fallback when offline.
  if (request.mode === "navigate") {
    event.respondWith(networkNavigation(request));
    return;
  }

  if (isExplicitStaticAsset(url)) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  // RSC payloads, auth endpoints, application data, and every other request
  // remain live-network dependent and are not persisted by this worker.
  event.respondWith(fetch(request));
});
