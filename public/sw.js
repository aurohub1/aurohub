/* Aurohub — Service Worker básico (app shell cache) */
const CACHE_VERSION = "aurohub-v2";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/logo-laranja.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Nunca cachear chamadas de API/auth/realtime
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/_next/data/") ||
    url.pathname.includes("supabase") ||
    url.pathname.includes("cloudinary")
  ) {
    return;
  }

  // Estratégia: cache-first para assets estáticos, network-first para HTML
  const isAsset = /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico|webp|gif)$/i.test(url.pathname) ||
                  url.pathname.startsWith("/_next/static/");

  if (isAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone)).catch(() => null);
          }
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // HTML/páginas: network-first com fallback ao cache
  event.respondWith(
    fetch(req).then((res) => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone)).catch(() => null);
      }
      return res;
    }).catch(() => caches.match(req).then((c) => c || caches.match("/")))
  );
});

/* ── Web Push ─────────────────────────────────────── */

self.addEventListener("push", (event) => {
  let payload = { title: "Aurohub", body: "Nova notificação", url: "/", tag: undefined, icon: "/icon-192.png" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (e) {
    try { payload.body = event.data ? event.data.text() : payload.body; } catch {}
  }

  const options = {
    body: payload.body,
    icon: payload.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag,
    data: { url: payload.url || "/" },
    renotify: !!payload.tag,
  };

  event.waitUntil(self.registration.showNotification(payload.title || "Aurohub", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      // Se já tem uma janela aberta do app, foca nela e navega
      for (const client of clientsArr) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(targetUrl).catch(() => null);
          return;
        }
      }
      // Senão abre nova
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
