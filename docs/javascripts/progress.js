/* OctoCat-Code — State management (localStorage)
 * Persiste : niveaux débloqués/terminés, langage choisi, succès.
 * Verrouille les pages de niveau dont le prérequis n'est pas validé.
 */
(function () {
  "use strict";

  var KEY = "octocat-code:v1";

  // Registre des niveaux (titres affichés dans le sélecteur de l'accueil et dans le générique).
  var LEVELS = [
    { id: 1, title: "La Forêt des Syntaxes" },
    { id: 2, title: "Le Village des Chaînes" },
    { id: 3, title: "La Mine des Opérations" },
    { id: 4, title: "Le Dojo des Torches" },
    { id: 5, title: "Le Pont des Booléens" },
    { id: 6, title: "Le Marché des Cristaux" },
    { id: 7, title: "La Forge des Répétitions" },
    { id: 8, title: "Le Temple des Cumuls" },
    { id: 9, title: "Le Tri des Glitches" },
    { id: 10, title: "L'Arène du Glitch Gardien" }
  ];

  // `?skin=N` dans l'adresse force l'apparence (démonstration) ; lu une seule fois au chargement, car le jeu nettoie ensuite l'adresse
  var FORCED_SKIN = (function () {
    try { var m = /[?&]skin=([0-4])\b/.exec(window.location.search); return m ? parseInt(m[1], 10) : -1; } catch { return -1; }
  })();
  // `?world=N` (0 pseudo-code, 1 Python, 2 JavaScript) force le monde et le langage (démonstration) ; lu une seule fois, comme `?skin=N`
  var FORCED_WORLD = (function () {
    try { var m = /[?&]world=([0-2])\b/.exec(window.location.search); return m ? parseInt(m[1], 10) : -1; } catch { return -1; }
  })();
  var MAX_SKIN = 4; // 0 à 3 : une apparence par tour (et au choix dès 500 pièces) ; 4 : OctoBot, le robot, secret (finir le jeu sans jamais utiliser la magie des torches)
  var LAPS = 3;// la fin du jeu : les 10 niveaux terminés 3 fois (un autre langage, donc un autre monde, à chaque tour)
  // Du plus doux au plus technique : le tour 1 est toujours en pseudo-code (monde de départ) ; ensuite on choisit Python ou JavaScript, et le dernier tour est l'autre.
  var LANG_LIST = ["Pseudo-code", "Python", "JavaScript"];

  var ACHIEVEMENTS = {
    first_compile: { icon: "⚡", title: "Premier Compile", desc: "Ton tout premier code qui marche !" },
    flawless: { icon: "💎", title: "Sans faute", desc: "Réussir un niveau du premier coup, sans erreur." },
    curious: { icon: "💡", title: "Curieux", desc: "Demander un coup de pouce (le bouton 💡 Indice)." },
    polyglot: { icon: "🌐", title: "Polyglotte", desc: "Découvrir un nouveau langage et son monde (pseudo-code, Python, JavaScript)." },
    lap1: { icon: "🥋", title: "Tour 1", desc: "Terminer les 10 niveaux une première fois." },
    lap2: { icon: "👑", title: "Tour 2", desc: "Terminer les 10 niveaux une deuxième fois." },
    lap3: { icon: "🌌", title: "Légende du code", desc: "Terminer les 10 niveaux trois fois : le jeu est fini !" },
    magic: { icon: "🪄", title: "Magicien", desc: "Éteindre les deux torches du portail… avec la magie." },
    robot: { icon: "🤖", title: "Robot d'acier", desc: "Finir le jeu sans jamais utiliser la magie des torches : OctoBot et Laita Turbo sont à toi !" }
  };

  function defaults() {
    return { version: 1, unlocked: 1, completed: {}, language: null, achievements: {}, fails: {}, coins: 0, earned: 0, skinPick: -1, robotSkin: false, robotSeen: false, magicUsed: 0, banked: {}, paid: {}, laps: 0, lapLang: "Pseudo-code", langsDone: [], pendingLap: false, creditsPending: false, finished: false };
  }

  // Repli en mémoire si localStorage est indisponible (navigation privée, etc.).
  var memory = null;

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return memory ? clone(memory) : defaults();
      var parsed = JSON.parse(raw), st = Object.assign(defaults(), parsed);
      if (!Array.isArray(parsed.langsDone)) { // ancienne sauvegarde (avant les mondes) : le tour 1 se jouait en Python
        st.langsDone = st.laps >= 1 ? ["Python"] : [];
        if (st.laps === 0 && st.lapLang === "Python") st.lapLang = "Pseudo-code";
      }
      return st;
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
      s.banked[id] = now; s.earned = Progress.earned() + gain; s.coins = Progress.coins() + gain;
      write(s);
      return gain;
    },

    /** Score : toutes les pièces gagnées depuis le début du jeu (les indices payés ne la font pas baisser). */
    earned: function () { var s = read(); return Math.max(Math.floor(s.earned) || 0, Math.max(0, Math.floor(s.coins) || 0)); },

    /** Au-delà de 499 pièces gagnées, on peut choisir son apparence (bouton de l'accueil). */
    SKIN_COINS: 500,
    canPickSkin: function () { return Progress.earned() >= Progress.SKIN_COINS || Progress.robotUnlocked(); },
    /** OctoBot (le robot) est débloqué en finissant le jeu sans jamais avoir utilisé la magie des torches. */
    robotUnlocked: function () { return !!read().robotSkin; },
    /** Le robot vient d'être gagné et le joueur ne l'a pas encore vu (l'accueil le lui présente une fois). */
    robotNew: function () { var s = read(); return !!s.robotSkin && !s.robotSeen; },
    robotSeen: function () { var s = read(); s.robotSeen = true; write(s); },
    /** Les apparences qu'on peut choisir : 0 à 3 dès 500 pièces, 4 (le robot) si on l'a gagné. */
    skinChoices: function () {
      var out = [], i;
      if (Progress.earned() >= Progress.SKIN_COINS) for (i = 0; i <= 3; i++) out.push(i);
      if (Progress.robotUnlocked()) out.push(4);
      return out;
    },
    /** Choisit l'apparence (0 à 4) ; -1 = celle du tour. Refusé si elle n'est pas débloquée. Renvoie true si c'est pris en compte. */
    pickSkin: function (n) {
      n = Math.floor(n);
      if (n !== -1 && Progress.skinChoices().indexOf(n) < 0) return false;
      var s = read(); s.skinPick = n; write(s);
      return true;
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

    /** Marque un niveau comme terminé, débloque le suivant et renvoie les succès obtenus.
     *  opts.magic : niveau passé grâce à l'Easter egg des torches (énigme non résolue) : il compte pour le tour et la fin du jeu, mais ne donne ni succès de niveau ni « sans faute ». */
    complete: function (id, opts) {
      var s = read(), magic = !!(opts && opts.magic);
      var flawless = !magic && !(s.fails[id] > 0);
      if (magic) s.magicUsed = (Math.floor(s.magicUsed) || 0) + 1; // la magie compte pour toute la partie : sans elle, le jeu fini donne OctoBot
      var gained = [];
      if (!(magic && s.completed[id])) s.completed[id] = magic ? { at: Date.now(), flawless: false, magic: true } : { at: Date.now(), flawless: flawless }; // la magie ne remplace pas une vraie réussite
      delete s.paid[id]; // au prochain passage, les indices sont à repayer
      s.unlocked = Math.max(s.unlocked, id + 1);
      function grant(key) {
        if (!s.achievements[key]) { s.achievements[key] = Date.now(); gained.push(key); }
      }
      if (!magic) grant("first_compile");
      if (flawless) grant("flawless");
      // les 10 niveaux sont finis : un tour de plus (nouvelle apparence, autre langage) ; au 3e tour, c'est la fin du jeu (crédits)
      gained.lap = null;
      if (id === LEVELS.length && s.laps < LAPS && LEVELS.every(function (lv) { return s.completed[lv.id]; })) {
        s.laps += 1; grant("lap" + s.laps);
        if (Array.isArray(s.langsDone) && s.langsDone.indexOf(s.lapLang) < 0) s.langsDone.push(s.lapLang);
        if (s.laps >= LAPS) {
          s.finished = true; s.creditsPending = true; gained.lap = "end";
          if (!s.magicUsed && !s.robotSkin) { s.robotSkin = true; s.robotSeen = false; grant("robot"); gained.robot = true; }
        }
        else { s.pendingLap = true; s.skinPick = -1; s.completed = {}; s.unlocked = 1; s.fails = {}; s.paid = {}; s.banked = {}; gained.lap = "lap"; }
      }
      write(s);
      return gained;
    },

    /* ----- Tours : 10 niveaux = 1 tour ; après chaque tour OctoCat et Laita changent d'apparence, et on choisit un langage ----- */
    LAPS: LAPS,
    languages: LANG_LIST,
    laps: function () { return Math.max(0, Math.min(LAPS, Math.floor(read().laps) || 0)); },
    /** Apparence en cours (0 = d'origine … 3) : celle du tour, ou celle choisie à l'accueil (score ≥ 500) ; `?skin=N` dans l'adresse la force (démonstration). */
    skin: function () {
      if (FORCED_SKIN >= 0) return FORCED_SKIN;
      var pick = Math.floor(read().skinPick);
      return pick >= 0 && pick <= MAX_SKIN && Progress.skinChoices().indexOf(pick) >= 0 ? pick : Progress.laps();
    },
    lang: function () {
      if (FORCED_WORLD >= 0) return LANG_LIST[FORCED_WORLD];
      var l = read().lapLang; return LANG_LIST.indexOf(l) >= 0 ? l : "Pseudo-code";
    },
    /** Le monde en cours (0 = GitHubia / pseudo-code, 1 = Python, 2 = JavaScript) : un langage = un monde. */
    world: function () { return LANG_LIST.indexOf(Progress.lang()); },
    worldOf: function (lang) { return LANG_LIST.indexOf(lang); },
    pendingLap: function () { return !!read().pendingLap; },
    creditsPending: function () { return !!read().creditsPending; },
    /** Les langages (donc les mondes) encore à découvrir : ceux qu'on n'a pas encore joués. Au tour 2 on a le choix, au tour 3 il n'en reste qu'un. */
    nextLangs: function () {
      var s = read(), used = (Array.isArray(s.langsDone) ? s.langsDone : []).concat([s.lapLang]);
      return LANG_LIST.filter(function (l) { return used.indexOf(l) < 0; });
    },
    /** Début d'un nouveau tour avec le langage choisi (parmi ceux qu'on n'a pas encore joués). */
    startLap: function (lang) {
      var s = read(), opts = Progress.nextLangs();
      s.lapLang = opts.indexOf(lang) >= 0 ? lang : (opts[0] || "Python"); s.pendingLap = false;
      write(s);
      Progress.grant("polyglot");
    },
    /** Jeu fini : on peut rejouer n'importe lequel des trois mondes (bouton MONDE de l'accueil). Refusé tant que le jeu n'est pas fini. */
    pickWorld: function (lang) {
      var s = read();
      if (!s.finished || LANG_LIST.indexOf(lang) < 0) return false;
      s.lapLang = lang; write(s);
      return true;
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
          s.completed[i] = c.magic === true ? { at: Number(c.at) || 0, flawless: false, magic: true } : { at: Number(c.at) || 0, flawless: !!c.flawless };
          s.unlocked = Math.max(s.unlocked, Math.min(max, i + 1));
        }
      });
      if (LANG_LIST.indexOf(o.language) >= 0) s.language = o.language;
      var lp = Math.floor(Number(o.laps));
      if (lp >= 0) s.laps = Math.min(LAPS, lp);
      if (LANG_LIST.indexOf(o.lapLang) >= 0) s.lapLang = o.lapLang;
      if (Array.isArray(o.langsDone)) o.langsDone.forEach(function (l) { if (LANG_LIST.indexOf(l) >= 0 && s.langsDone.indexOf(l) < 0) s.langsDone.push(l); });
      else if (s.laps >= 1) s.langsDone = ["Python"];
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
      var ea = Math.floor(Number(o.earned));
      if (ea > 0) s.earned = Math.min(ea, 99999);
      var pk = Math.floor(Number(o.skinPick));
      if (pk >= 0 && pk <= MAX_SKIN) s.skinPick = pk;
      s.robotSkin = o.robotSkin === true; s.robotSeen = o.robotSeen === true;
      var mu = Math.floor(Number(o.magicUsed));
      if (mu > 0) s.magicUsed = Math.min(mu, 99);
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
})();
