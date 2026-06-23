const CACHE = 'uma-v7'
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
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Network first, cache fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)

  // No cachear llamadas a Supabase ni a esm.sh
  if (url.hostname.includes('supabase') || url.hostname.includes('esm.sh') || url.hostname.includes('unpkg')) return

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
