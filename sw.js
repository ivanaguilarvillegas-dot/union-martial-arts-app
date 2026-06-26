const CACHE = 'uma-v15'
const SHELL = [
  '/',
  '/home.html',
  '/index.html',
  '/css/uma.css',
  '/manifest.json',
  '/assets/logo-union-stacked.png',
  '/assets/logo-union-white.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(c => c.navigate(c.url)))
  )
})

// HTML: siempre red, nunca cache. Assets: network first, cache fallback.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)

  // No interceptar Supabase / CDNs externos
  if (url.hostname.includes('supabase') || url.hostname.includes('esm.sh') ||
      url.hostname.includes('unpkg') || url.hostname.includes('jsdelivr') ||
      url.hostname.includes('cdn.')) return

  // HTML — siempre desde red, sin guardar en caché
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(() => caches.match(e.request).then(r => r || caches.match('/home.html')))
    )
    return
  }

  // Assets (CSS, JS, imágenes) — network first, cache fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('/home.html')))
  )
})
