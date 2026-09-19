/**
 * Service worker for PafosLive.
 *
 * Deliberately minimal. It caches the application shell so the reporting form
 * opens on a bad connection, and it does nothing else.
 *
 * In particular it NEVER caches API responses and never serves a stale report
 * list: a citizen looking at the public board must be looking at the real
 * current state, not a copy from an earlier visit that may show a hazard as
 * open after it was fixed, or hide one that was reported since. Report
 * submission is likewise never intercepted here -- queued reports are held in
 * IndexedDB by the page and sent only when the server can confirm them, so that
 * nothing can appear submitted when it is not.
 */

const CACHE = "pafoslive-shell-v2";
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => {
        // A failed pre-cache must not block installation; the app still works
        // online and will cache on the next successful navigation.
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache data, photos or moderation surfaces.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network first, falling back to the cached shell when offline,
  // so the reporting form is reachable without a connection.
  if (request.mode === "navigate") {
    // Other pages must never replace the reporting shell (or cache moderation).
    if (url.pathname !== "/") return;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("/", copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match("/").then((cached) => cached ?? Response.error())),
    );
    return;
  }

  // Static build assets are immutable, so cache-first is safe for them only.
  if (url.pathname.startsWith("/_next/static/") || SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
            return response;
          }),
      ),
    );
  }
});
