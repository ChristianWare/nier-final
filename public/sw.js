/* eslint-disable @typescript-eslint/no-unused-vars */
// public/sw.js
// Nier Transportation - PWA Service Worker
// Handles push notifications for admin and driver users only.

const APP_NAME = "Nier Transportation";
const CACHE_NAME = "nier-pwa-v1";

// ─── Push Event ────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: APP_NAME, body: event.data.text(), url: "/" };
  }

  const {
    title = APP_NAME,
    body = "",
    url = "/",
    tag = "nier-notification",
    icon = "/icons/pwa-192x192.png",
    badge = "/icons/pwa-badge-96x96.png",
    urgent = false,
  } = payload;

  const options = {
    body,
    icon,
    badge,
    tag,
    data: { url },
    requireInteraction: urgent,
    vibrate: urgent ? [200, 100, 200, 100, 200] : [200, 100, 200],
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
    timestamp: Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification Click ─────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});

// ─── Install / Activate (minimal — no aggressive caching) ──────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
