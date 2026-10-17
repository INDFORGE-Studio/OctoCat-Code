/* OctoCat-Code — State management (localStorage)
 * Persiste : niveaux débloqués/terminés, langage choisi, succès.
 * Verrouille les pages de niveau dont le prérequis n'est pas validé.
 */
(function () {
  "use strict";

  var KEY = "octocat-code:v1";

  // Registre des niveaux. `path` est relatif à la racine du site.
  var LEVELS = [
    { id: 1, zone: 1, title: "La Forêt des Syntaxes", path: "niveau-1/" },
    { id: 2, zone: 1, title: "Le Village des Chaînes", path: "niveau-2/" },
    { id: 3, zone: 1, title: "La Mine des Opérations", path: "niveau-3/" },
    { id: 4, zone: 1, title: "Le Dojo des Torches", path: "niveau-4/" },
    { id: 5, zone: 1, title: "Le Pont des Booléens", path: "niveau-5/" },
    { id: 6, zone: 1, title: "Le Marché des Cristaux", path: "niveau-6/" },
    { id: 7, zone: 1, title: "La Forge des Répétitions", path: "niveau-7/" },
    { id: 8, zone: 1, title: "Le Temple des Cumuls", path: "niveau-8/" },
    { id: 9, zone: 1, title: "Le Tri des Glitches", path: "niveau-9/" },
    { id: 10, zone: 1, title: "L'Arène du Glitch Gardien", path: "niveau-10/" }
  ];

  // `?skin=N` dans l'adresse force l'apparence (démonstration) ; lu une seule fois au chargement, car le jeu nettoie ensuite l'adresse
  var FORCED_SKIN = (function () {
    try { var m = /[?&]skin=([0-3])\b/.exec(window.location.search); return m ? parseInt(m[1], 10) : -1; } catch { return -1; }
  })();
  var LAPS = 3;// la fin du jeu : les 10 niveaux terminés 3 fois (un autre langage à chaque tour)
  var LANG_LIST = ["Python", "JavaScript", "Pseudo-code"];

  var ACHIEVEMENTS = {
    first_compile: { icon: "⚡", title: "Premier Compile", desc: "Ton tout premier code qui marche !" },
    flawless: { icon: "💎", title: "Sans faute", desc: "Réussir un niveau du premier coup, sans erreur." },
    curious: { icon: "💡", title: "Curieux", desc: "Demander un coup de pouce (le bouton 💡 Indice)." },
    polyglot: { icon: "🌐", title: "Polyglotte", desc: "Essayer un autre langage (Python, JavaScript, pseudo-code)." },
    lap1: { icon: "🥋", title: "Tour 1", desc: "Terminer les 10 niveaux une première fois." },
    lap2: { icon: "👑", title: "Tour 2", desc: "Terminer les 10 niveaux une deuxième fois." },
    lap3: { icon: "🌌", title: "Légende du code", desc: "Terminer les 10 niveaux trois fois : le jeu est fini !" },
    magic: { icon: "🪄", title: "Magicien", desc: "Éteindre les deux torches du portail… avec la magie." }
  };

  function defaults() {
    return { version: 1, unlocked: 1, completed: {}, language: null, achievements: {}, fails: {}, coins: 0, banked: {}, paid: {}, laps: 0, lapLang: "Python", pendingLap: false, creditsPending: false, finished: false };
  }

  // Repli en mémoire si localStorage est indisponible (navigation privée, etc.).
  var memory = null;

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return memory ? clone(memory) : defaults();
      var parsed = JSON.parse(raw);
      return Object.assign(defaults(), parsed);
    } catch {
      return memory ? clone(memory) : defaults();
    }
  }

  function write(state) {
    memory = clone(state);
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* mémoire seule */ }
    document.dispatchEvent(new CustomEvent("octo:progress", { detail: state }));
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var Progress = {
    levels: LEVELS,
    achievements: ACHIEVEMENTS,

    get: function () { return read(); },

    isUnlocked: function (id) { return id <= read().unlocked; },
    isCompleted: function (id) { return !!read().completed[id]; },

    recordFail: function (id) {
      var s = read();
      s.fails[id] = (s.fails[id] || 0) + 1;
      write(s);
    },

    failsFor: function (id) { return read().fails[id] || 0; },

    /* ----- Pièces : gagnées pendant les trajets, dépensées pour acheter les indices ----- */

    /** Nombre de pièces en poche. */
    coins: function () { return Math.max(0, Math.floor(read().coins) || 0); },

    /** Encaisse les pièces d'un trajet : seulement celles qu'on n'avait pas déjà gagnées à ce niveau (pas de pièces à l'infini en rejouant). Renvoie le gain. */
    bank: function (id, n) {
      var s = read(), have = Math.floor(s.banked[id]) || 0, now = Math.max(0, Math.floor(n) || 0), gain = Math.max(0, now - have);
      if (!gain) return 0;
      s.banked[id] = now; s.coins = Progress.coins() + gain;
      write(s);
      return gain;
    },

    /** Nombre d'indices déjà payés pour ce niveau (ils restent visibles jusqu'à la réussite du niveau). */
    paidHints: function (id) { return Math.max(0, Math.floor(read().paid[id]) || 0); },

    /** Paie l'indice suivant du niveau : renvoie true si le prix a pu être payé (sinon rien ne change). */
    payHint: function (id, price) {
      var s = read();
      price = Math.max(0, Math.floor(price) || 0);
      if (Progress.coins() < price) return false;
      s.coins = Progress.coins() - price;
      s.paid[id] = Progress.paidHints(id) + 1;
      write(s);
      return true;
    },

    /** Marque un niveau comme terminé, débloque le suivant et renvoie les succès obtenus. */
    complete: function (id) {
      var s = read();
      var flawless = !(s.fails[id] > 0);
      var gained = [];
      s.completed[id] = { at: Date.now(), flawless: flawless };
      delete s.paid[id]; // au prochain passage, les indices sont à repayer
      s.unlocked = Math.max(s.unlocked, id + 1);
      function grant(key) {
        if (!s.achievements[key]) { s.achievements[key] = Date.now(); gained.push(key); }
      }
      grant("first_compile");
      if (flawless) grant("flawless");
      // les 10 niveaux sont finis : un tour de plus (nouvelle apparence, autre langage) ; au 3e tour, c'est la fin du jeu (crédits)
      gained.lap = null;
      if (id === LEVELS.length && s.laps < LAPS && LEVELS.every(function (lv) { return s.completed[lv.id]; })) {
        s.laps += 1; grant("lap" + s.laps);
        if (s.laps >= LAPS) { s.finished = true; s.creditsPending = true; gained.lap = "end"; }
        else { s.pendingLap = true; s.completed = {}; s.unlocked = 1; s.fails = {}; s.paid = {}; s.banked = {}; gained.lap = "lap"; }
      }
      write(s);
      return gained;
    },

    /** Easter egg des torches : ouvre le niveau suivant SANS valider celui-ci (ni pièces, ni succès, ni fin de tour). */
    unlockAfter: function (id) {
      var s = read(), n = Math.min(LEVELS.length, Math.floor(id) + 1);
      if (n > s.unlocked) { s.unlocked = n; write(s); }
    },

    /* ----- Tours : 10 niveaux = 1 tour ; après chaque tour OctoCat et Laita changent d'apparence, et on choisit un langage ----- */
    LAPS: LAPS,
    languages: LANG_LIST,
    laps: function () { return Math.max(0, Math.min(LAPS, Math.floor(read().laps) || 0)); },
    /** Apparence en cours (0 = d'origine … 3) ; `?skin=N` dans l'adresse la force (démonstration). */
    skin: function () { return FORCED_SKIN >= 0 ? FORCED_SKIN : Progress.laps(); },
    lang: function () { var l = read().lapLang; return LANG_LIST.indexOf(l) >= 0 ? l : "Python"; },
    pendingLap: function () { return !!read().pendingLap; },
    creditsPending: function () { return !!read().creditsPending; },
    /** Début d'un nouveau tour avec le langage choisi. */
    startLap: function (lang) {
      var s = read();
      s.lapLang = LANG_LIST.indexOf(lang) >= 0 ? lang : "Python"; s.pendingLap = false;
      write(s);
      if (s.lapLang !== "Python") Progress.grant("polyglot");
    },
    finishCredits: function () { var s = read(); s.creditsPending = false; write(s); },

    grant: function (key) {
      var s = read();
      if (s.achievements[key]) return false;
      s.achievements[key] = Date.now();
      write(s);
      return true;
    },

    setLanguage: function (lang) {
      var s = read();
      s.language = lang;
      write(s);
      Progress.grant("polyglot");
    },

    /** Déverrouille tous les niveaux (démonstration : ?unlock=all dans l'adresse). */
    unlockAll: function () { var s = read(); s.unlocked = LEVELS.length; write(s); },

    reset: function () { write(defaults()); },

    /** Sauvegarde sous forme de texte (à copier) et rechargement depuis ce texte, avec validation stricte. */
    exportSave: function () { return JSON.stringify(read()); },
    importSave: function (text) {
      var o;
      try { o = JSON.parse(String(text || "").trim()); } catch { return { ok: false, error: "Ce code est illisible." }; }
      if (!o || typeof o !== "object" || Array.isArray(o)) return { ok: false, error: "Ce code n'est pas une sauvegarde." };
      var max = LEVELS.length, s = defaults(), n = Math.floor(Number(o.unlocked));
      if (!(n >= 1)) return { ok: false, error: "Ce code n'est pas une sauvegarde." };
      s.unlocked = Math.min(max, n);
      if (o.completed && typeof o.completed === "object") Object.keys(o.completed).forEach(function (id) {
        var i = parseInt(id, 10), c = o.completed[id];
        if (i >= 1 && i <= max && c && typeof c === "object") {
          s.completed[i] = { at: Number(c.at) || 0, flawless: !!c.flawless };
          s.unlocked = Math.max(s.unlocked, Math.min(max, i + 1));
        }
      });
      if (LANG_LIST.indexOf(o.language) >= 0) s.language = o.language;
      var lp = Math.floor(Number(o.laps));
      if (lp >= 0) s.laps = Math.min(LAPS, lp);
      if (LANG_LIST.indexOf(o.lapLang) >= 0) s.lapLang = o.lapLang;
      s.pendingLap = o.pendingLap === true; s.creditsPending = o.creditsPending === true; s.finished = o.finished === true || s.laps >= LAPS;
      if (o.achievements && typeof o.achievements === "object") Object.keys(o.achievements).forEach(function (key) {
        if (ACHIEVEMENTS[key]) s.achievements[key] = Number(o.achievements[key]) || 1;
      });
      if (o.fails && typeof o.fails === "object") Object.keys(o.fails).forEach(function (id) {
        var i = parseInt(id, 10), v = Math.floor(Number(o.fails[id]));
        if (i >= 1 && i <= max && v > 0) s.fails[i] = v;
      });
      var c = Math.floor(Number(o.coins));
      if (c > 0) s.coins = Math.min(c, 99999);
      if (o.banked && typeof o.banked === "object") Object.keys(o.banked).forEach(function (id) {
        var i = parseInt(id, 10), v = Math.floor(Number(o.banked[id]));
        if (i >= 1 && i <= max && v > 0) s.banked[i] = Math.min(v, 999);
      });
      if (o.paid && typeof o.paid === "object") Object.keys(o.paid).forEach(function (id) {
        var i = parseInt(id, 10), v = Math.floor(Number(o.paid[id]));
        if (i >= 1 && i <= max && v > 0) s.paid[i] = Math.min(v, 9);
      });
      write(s);
      return { ok: true };
    }
  };

  window.OctoProgress = Progress;

  /* ---------- helpers de page ---------- */

  function onPage(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /** Verrou : remplace le contenu d'une page de niveau si le prérequis manque. */
  function guard() {
    var el = document.querySelector("[data-octo-guard]");
    if (!el) return;
    var id = parseInt(el.getAttribute("data-octo-guard"), 10);
    if (Progress.isUnlocked(id)) return;
    var hub = el.getAttribute("data-hub") || "../";
    var article = document.querySelector("article.md-content__inner") || el.parentNode;
    article.innerHTML =
      '<div class="octo-lock">' +
      '<div class="octo-lock__icon">🔒</div>' +
      "<h1>Portail verrouillé</h1>" +
      "<p>Le Niveau " + id + " n'est pas encore accessible. Termine d'abord le niveau précédent pour réparer le chemin.</p>" +
      '<p><a class="md-button md-button--primary" href="' + esc(hub) + '">Retour au hub</a></p>' +
      "</div>";
  }

  /** Tableau de bord de progression (page d'accueil). */
  function renderHud() {
    var el = document.getElementById("octo-hud");
    if (!el) return;
    var root = el.getAttribute("data-root") || "./";
    var s = Progress.get();
    var html = '<div class="octo-hud__levels">';
    var nextId = null;
    LEVELS.forEach(function (lv) {
      var done = !!s.completed[lv.id];
      var open = lv.id <= s.unlocked;
      if (open && !done && nextId === null) nextId = lv.id;
      var state = done ? "done" : open ? "open" : "locked";
      var badge = done ? "✔ Terminé" : open ? "▶ Disponible" : "🔒 Verrouillé";
      var inner = '<span class="octo-card__zone">Zone ' + lv.zone + "</span>" +
        '<strong class="octo-card__title">Niveau ' + lv.id + " · " + esc(lv.title) + "</strong>" +
        '<span class="octo-card__badge">' + badge + "</span>";
      html += open
        ? '<a class="octo-card octo-card--' + state + '" href="' + esc(root + lv.path) + '">' + inner + "</a>"
        : '<div class="octo-card octo-card--' + state + '">' + inner + "</div>";
    });
    html += "</div>";

    html += '<div class="octo-hud__ach">';
    Object.keys(ACHIEVEMENTS).forEach(function (key) {
      var a = ACHIEVEMENTS[key];
      var got = !!s.achievements[key];
      html += '<span class="octo-ach' + (got ? " octo-ach--got" : "") + '" title="' + esc(a.desc) + '">' +
        (got ? a.icon : "❔") + " " + esc(got ? a.title : "???") + "</span>";
    });
    html += "</div>";

    html += '<p class="octo-hud__meta">Langage préféré : <code>' + esc(s.language || "non choisi") + "</code> · " +
      '<button type="button" class="octo-link" id="octo-reset">Réinitialiser la progression</button></p>';

    el.innerHTML = html;
    var btn = document.getElementById("octo-reset");
    if (btn) btn.addEventListener("click", function () {
      if (window.confirm("Effacer toute ta progression ?")) Progress.reset();
    });
  }

  /** Mémorise le langage choisi via les onglets pymdownx.tabbed (Python / JavaScript). */
  function bindLanguageTabs() {
    document.addEventListener("change", function (e) {
      var t = e.target;
      if (!t || !t.matches || !t.matches(".tabbed-set > input")) return;
      var label = document.querySelector('label[for="' + t.id + '"]');
      var name = label && label.textContent.trim();
      if (name === "Python" || name === "JavaScript") Progress.setLanguage(name);
    });
  }

  onPage(function () {
    guard();
    renderHud();
    bindLanguageTabs();
  });
  document.addEventListener("octo:progress", renderHud);
})();
