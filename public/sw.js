// Minimal service worker — makes the app installable (PWA) and lets visited
// pages/assets work offline. Large media (video, 3D models) is left to the
// network so the cache never bloats.
const CACHE = "rose-cache-v1"
const SHELL = ["/"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ── Web Push: "I miss you" pings ────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = {} }
  const title = data.title || "Someone misses you 💗"
  const body = data.body || "Tap to reach back."
  const url = data.url || "/"
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // Group repeated pings so they collapse into the latest instead of stacking.
      tag: "miss-you",
      renotify: true,
      vibrate: [80, 40, 80],
      data: { url },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return

  const url = new URL(req.url)
  // Only handle same-origin requests; let fonts / Supabase / CDNs go to network.
  if (url.origin !== self.location.origin) return
  // Don't cache big media — too large for the runtime cache.
  if (/\.(mp4|glb|gltf|hdr|exr|wav)$/i.test(url.pathname)) return

  // Network-first: fresh when online, cached fallback when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        }
        return res
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached
          if (req.mode === "navigate") return caches.match("/")
          return Response.error()
        })
      )
  )
})
