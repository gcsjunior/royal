/* Copa das Nações 2026 — Service Worker
   Estratégia: network-first para os arquivos estáticos do app (HTML/CSS/ícones),
   com fallback para cache quando offline. Requisições para o Supabase (outra origem)
   são SEMPRE feitas direto na rede, para que os placares ao vivo nunca venham do cache.

   IMPORTANTE: ao publicar uma nova versão das páginas, troque o número da versão
   abaixo (v1 -> v2 ...) para forçar a atualização do cache nas TVs/celulares. */
const CACHE = 'copa-2026-v1';

const SHELL = [
  'calendario.html',
  'resultados.html',
  'grupos.html',
  'atletas.html',
  'patrocinadores.html',
  'fotos.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return Promise.allSettled(SHELL.map(function (u) { return c.add(u); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                 // não intercepta POST/PATCH/etc
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // Supabase e externos -> sempre rede (dados ao vivo)

  // network-first: tenta a rede, atualiza o cache; se falhar (offline), usa o cache
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match('calendario.html');
      });
    })
  );
});
