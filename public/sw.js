const CACHE_VERSION = 'v1'
const STATIC_CACHE = `cms-static-${CACHE_VERSION}`
const PAGES_CACHE = `cms-pages-${CACHE_VERSION}`
const AUTH_CACHE = `cms-auth-${CACHE_VERSION}`

const ALL_CACHES = [STATIC_CACHE, PAGES_CACHE, AUTH_CACHE]

// On install: take control immediately
self.addEventListener('install', () => {
  self.skipWaiting()
})

// On activate: delete old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests
  if (url.origin !== self.location.origin) return
  if (request.method !== 'GET') return

  // Cache-first for Next.js static assets (content-hashed filenames, safe to cache forever)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(STATIC_CACHE, request))
    return
  }

  // Network-first with cache fallback for auth session
  // This allows useSession() to work when offline by serving the last known session
  if (url.pathname === '/api/auth/session') {
    event.respondWith(networkFirstWithCache(AUTH_CACHE, request))
    return
  }

  // Skip all other API routes — let them fail naturally when offline
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return

  // Network-first with cache fallback for page navigations (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithCache(PAGES_CACHE, request))
  }
})

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return new Response('Network error', { status: 503 })
  }
}

async function networkFirstWithCache(cacheName, request) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached

    // For auth/session specifically, return an empty session instead of error
    if (new URL(request.url).pathname === '/api/auth/session') {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Offline', { status: 503 })
  }
}
