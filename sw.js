// 大张工作台 PWA service worker
// 策略: HTML network-first / ver.json+hot.json network-only / 同源静态 cache-first / 跨域放行
const CACHE = 'dazhang-shell-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;                 // 云备份 PUT 等直接放行
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;             // 跨域不拦截

  if (/\/(ver|hot)\.json$/.test(url.pathname)) return;    // 版本自检/热点永不缓存

  var accept = e.request.headers.get('accept') || '';
  if (e.request.mode === 'navigate' || accept.indexOf('text/html') !== -1) {
    e.respondWith(                                        // HTML: network-first
      fetch(e.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return resp;
      }).catch(function () {
        return caches.match(e.request).then(function (r) { return r || caches.match('./'); });
      })
    );
    return;
  }

  e.respondWith(                                          // 同源静态: cache-first
    caches.match(e.request).then(function (r) {
      return r || fetch(e.request).then(function (resp) {
        if (resp.ok) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      });
    })
  );
});
