/* OctoCat-Code — Enregistre le service worker (cache hors ligne). Silencieux si le navigateur ne le permet pas.
 * En local (mkdocs serve, npm run shot) il est désactivé, pour ne jamais servir des fichiers périmés pendant le
 * développement ; `?pwa=on` dans l'adresse le force (utilisé par le test hors ligne). */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || !("serviceWorker" in navigator)) return;
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname) && !/[?&]pwa=on\b/.test(window.location.search);
  window.addEventListener("load", function () {
    if (local) {
      navigator.serviceWorker.getRegistrations().then(function (list) { list.forEach(function (r) { r.unregister(); }); }).catch(function () {});
      return;
    }
    // javascripts/pwa.js -> ../sw.js : la portée couvre tout le site, quel que soit le dossier d'hébergement
    navigator.serviceWorker.register(new URL("../sw.js", script.src).href).catch(function () { /* HTTP simple, mode privé… : ignoré */ });
  });
})();
