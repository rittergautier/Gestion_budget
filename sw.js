/* Service worker — cache de l’application (fonctionnement hors-ligne) */
const CACHE = 'budget-v12'; // ⚠️ garder synchronisé avec APP_VERSION ('v12') dans app.js
const SHELL = ['./', './index.html', './aide.html', './styles.css', './theme.js', './cats.js', './app.js', './firebase-config.js', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'GET_VERSION' && e.ports && e.ports[0]) e.ports[0].postMessage(CACHE);
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (url.origin === location.origin) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('./index.html'))));
  } else if (/gstatic\.com|googleapis\.com|fonts\.gstatic/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      c.put(e.request, copy);
      return res;
    }))));
  }
});
