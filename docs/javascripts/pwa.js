/* OctoCat-Code — Enregistre le service worker (cache hors ligne). Silencieux si le navigateur ne le permet pas.
 * En local (mkdocs serve, npm run shot) il est désactivé, pour ne jamais servir des fichiers périmés pendant le
 * développement ; `?pwa=on` dans l'adresse le force (utilisé par le test hors ligne). */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || !("serviceWorker" in navigator)) return;
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname) && !/[?&]pwa=on\b/.test(window.location.search);
  // Une nouvelle version s'installe en arrière-plan pendant qu'on joue l'ancienne (cache d'abord) : sans cela, il fallait recharger DEUX fois pour la voir.
  // Si elle prend la main juste après l'ouverture de la page (le joueur vient de recharger, il est encore à l'accueil), on recharge tout seul, une fois.
  var hadController = !!navigator.serviceWorker.controller, reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!hadController || reloaded || local || window.performance.now() > 15000) return;
    reloaded = true; window.location.reload();
  });
  window.addEventListener("load", function () {
    if (local) {
      navigator.serviceWorker.getRegistrations().then(function (list) { list.forEach(function (r) { r.unregister(); }); }).catch(function () {});
      return;
    }
    // javascripts/pwa.js -> ../sw.js : la portée couvre tout le site, quel que soit le dossier d'hébergement
    navigator.serviceWorker.register(new URL("../sw.js", script.src).href).catch(function () { /* HTTP simple, mode privé… : ignoré */ });
  });
})();
