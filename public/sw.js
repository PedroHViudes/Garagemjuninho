// Service worker simples: deixa o app abrir mesmo sem internet
const CACHE = 'garagem-v5';
const ARQS = ['/', '/index.html', '/css/app.css', '/js/core.js', '/js/telas.js', '/js/veiculo.js', '/js/extras.js', '/js/ia.js', '/js/massa.js', '/js/ferramentas.js', '/dados.js', '/vendor/jszip.min.js', '/icon.svg', '/manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQS).catch(() => {}))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.startsWith('/midias/') || u.pathname.startsWith('/api/')) return; // fotos/vídeos do código vão direto
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.ok && r.type === 'basic') { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); }
      return r;
    }).catch(() => caches.match(e.request).then((m) => m || caches.match('/')))
  );
});
