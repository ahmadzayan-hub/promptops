// PromptOps · ZAIan Studio — Service Worker
const CACHE_NAME = "promptops-v1";
const OFFLINE_URL = "/offline";

// App shell resources to pre-cache
const PRECACHE_URLS = [
  "/",
  "/offline",
  "/studio",
  "/manifest.webmanifest",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS.map(url => {
      // Don't fail install if some resources fail
      return cache.add(url).catch(() => {});
    })))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const { request } = event;

  // Skip non-GET and API requests (no caching)
  if (request.method !== "GET") return;
  if (request.url.includes("/api/")) return;
  if (request.url.includes("supabase.co")) return;

  // Network-first strategy for HTML navigation
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(r => r ?? new Response("Offline", { status: 503 }))
      )
    );
    return;
  }

  // Cache-first for static assets
  if (request.destination === "style" || request.destination === "script" || request.destination === "image") {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
});
