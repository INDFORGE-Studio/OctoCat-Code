/* OctoCat-Code — Service worker : le jeu s'installe dans le navigateur de chaque joueur.
 * Au premier chargement, tout le site (~3 Mo) est mis en cache : ensuite, chargement instantané et jeu hors ligne.
 * VERSION et PRECACHE sont réécrits à chaque build par tools/postbuild.py ; une nouvelle version
 * remplace l'ancien cache au rechargement suivant. La progression, elle, vit dans localStorage (OctoProgress).
 */
var VERSION = "__VERSION__";
var PRECACHE = ["./"]; /* __PRECACHE__ */
var CACHE = "octocat-" + VERSION;

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k.indexOf("octocat-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

// Cache d'abord (instantané, hors ligne), réseau en secours ; la page d'accueil sert de repli de navigation.
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(req).catch(function () {
        return req.mode === "navigate" ? caches.match("./") : Response.error();
      });
    })
  );
});
