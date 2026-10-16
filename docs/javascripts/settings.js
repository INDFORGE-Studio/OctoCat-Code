/* OctoCat-Code — Réglages du joueur (localStorage, aucun serveur).
 *
 *   OctoSettings.get(nom) / set(nom, valeur)   options : sfx, shake, hints, pad, relax, skipAlways
 *   OctoSettings.lookup(code)                  action liée à une touche (« KeyX », « Space ») ou un bouton de souris (« Mouse0 »)
 *   OctoSettings.keys(action) / bind / unbind  touches personnalisées (jusqu'à 4 par action, clavier ou souris)
 *   OctoSettings.open() / close() / toggle()   menu ⚙ (Échap) ; isOpen() met la partie en pause
 *   OctoSettings.mountButton(conteneur)        ajoute le bouton ⚙ à la boîte son
 *
 * Les codes sont les codes PHYSIQUES du clavier (KeyW = la touche Z d'un AZERTY) : ils valent pour toutes les dispositions.
 * Toute la logique (touches, sauvegarde) est pure et testée sous Node ; l'interface n'existe que dans un navigateur.
 */
(function () {
  "use strict";

  var KEY = "octocat-code:settings:v1";

  var ACTIONS = [
    { id: "left", label: "Aller à gauche" },
    { id: "right", label: "Aller à droite" },
    { id: "jump", label: "Sauter" },
    { id: "up", label: "Haut", note: "saute en plateforme, monte dans l'arène" },
    { id: "down", label: "Bas", note: "descend dans l'arène" },
    { id: "attack", label: "Frapper" },
    { id: "throw", label: "Lancer un shuriken", note: "niveaux avec shuriken" }
  ];

  var DEFAULT_KEYS = {
    left: ["ArrowLeft", "KeyA"], right: ["ArrowRight", "KeyD"], up: ["ArrowUp", "KeyW"], down: ["ArrowDown", "KeyS"],
    jump: ["Space"], attack: ["KeyX", "KeyJ", "Mouse0"], throw: ["KeyC", "KeyK", "Mouse2"]
  };
  var DEFAULT_OPTS = { sfx: true, shake: true, hints: true, pad: "auto", relax: false, skipAlways: false };
  var PAD_MODES = ["auto", "on", "off"];
  var MAX_BINDS = 4;
  var BLOCKED = /^(Escape|Tab|F\d{1,2}|MetaLeft|MetaRight|OSLeft|OSRight|ContextMenu|PrintScreen)$/;
  var VALID = /^[A-Za-z0-9]{2,24}$/;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- état ---------- */

  var state = null, rev = null, version = 0, listeners = [], seen = {}, layout = null;

  function sanitize(raw) {
    var out = clone(DEFAULT_OPTS), used = {}, keys = {};
    if (raw && typeof raw === "object") {
      Object.keys(DEFAULT_OPTS).forEach(function (n) {
        if (typeof raw[n] === typeof DEFAULT_OPTS[n]) out[n] = raw[n];
      });
      if (PAD_MODES.indexOf(out.pad) < 0) out.pad = "auto";
    }
    ACTIONS.forEach(function (a) {
      var src = raw && raw.keys && Array.isArray(raw.keys[a.id]) ? raw.keys[a.id] : DEFAULT_KEYS[a.id], list = [];
      src.forEach(function (c) {
        if (typeof c === "string" && VALID.test(c) && !BLOCKED.test(c) && !used[c] && list.length < MAX_BINDS) { used[c] = 1; list.push(c); }
      });
      keys[a.id] = list;
    });
    out.keys = keys;
    return out;
  }

  function load() {
    var raw = null;
    try { raw = JSON.parse(window.localStorage.getItem(KEY)); } catch { /* valeurs par défaut */ }
    state = sanitize(raw);
  }

  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* mémoire seule */ }
  }

  function bump() {
    version++; rev = null;
    listeners.slice().forEach(function (fn) { try { fn(); } catch { /* un abonné fautif ne bloque pas les autres */ } });
  }

  function actionLabel(id) { for (var i = 0; i < ACTIONS.length; i++) if (ACTIONS[i].id === id) return ACTIONS[i].label; return id; }

  /* ---------- noms de touches ---------- */

  var MOUSE = { Mouse0: "Clic gauche", Mouse1: "Clic molette", Mouse2: "Clic droit", Mouse3: "Souris 4", Mouse4: "Souris 5" };
  var NAMES = {
    Space: "Espace", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", Enter: "Entrée", NumpadEnter: "Entrée (pavé)",
    ShiftLeft: "Maj gauche", ShiftRight: "Maj droite", ControlLeft: "Ctrl gauche", ControlRight: "Ctrl droit", AltLeft: "Alt", AltRight: "Alt Gr",
    Backspace: "Retour", CapsLock: "Verr. Maj", Comma: ",", Period: ".", Slash: "/", Semicolon: ";", Quote: "'", Minus: "-", Equal: "=",
    BracketLeft: "[", BracketRight: "]", Backslash: "\\", Backquote: "`", Delete: "Suppr", Insert: "Inser", Home: "Début", End: "Fin",
    PageUp: "Page ↑", PageDown: "Page ↓"
  };
  // Sans information de disposition (Firefox, Safari), les touches par défaut de WASD s'affichent pour QWERTY et AZERTY.
  var FALLBACK = { KeyW: "W / Z", KeyA: "A / Q" };

  function label(code) {
    if (MOUSE[code]) return MOUSE[code];
    if (NAMES[code]) return NAMES[code];
    if (layout && layout.get && layout.get(code)) return String(layout.get(code)).toUpperCase();
    if (seen[code]) return seen[code];
    if (FALLBACK[code]) return FALLBACK[code];
    var m = /^Key([A-Z])$/.exec(code) || /^Digit(\d)$/.exec(code);
    if (m) return m[1];
    var n = /^Numpad(\w+)$/.exec(code);
    return n ? "Pavé " + n[1] : code;
  }

  /** Version sans accents ni symboles, pour le texte dessiné dans le canvas (police par défaut de KAPLAY). */
  function ascii(code) {
    var A = { ArrowLeft: "GAUCHE", ArrowRight: "DROITE", ArrowUp: "HAUT", ArrowDown: "BAS", Space: "ESPACE", Mouse0: "CLIC GAUCHE", Mouse2: "CLIC DROIT", Mouse1: "CLIC MOLETTE" };
    if (A[code]) return A[code];
    return label(code).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7e]/g, "?").toUpperCase();
  }

  /* ---------- API ---------- */

  function lookup(code) {
    if (!rev) {
      rev = {};
      ACTIONS.forEach(function (a) { state.keys[a.id].forEach(function (c) { rev[c] = a.id; }); });
    }
    return rev[code] || null;
  }

  var Settings = {
    actions: ACTIONS,
    defaultKeys: DEFAULT_KEYS,
    version: function () { return version; },
    get: function (n) { return state[n]; },
    set: function (n, v) {
      if (!(n in DEFAULT_OPTS) || typeof v !== typeof DEFAULT_OPTS[n]) return false;
      if (n === "pad" && PAD_MODES.indexOf(v) < 0) return false;
      state[n] = v; save(); bump();
      return true;
    },
    keys: function (action) { return (state.keys[action] || []).slice(); },
    lookup: lookup,
    label: label,
    ascii: ascii,
    /** Texte d'aide pour une action : ses n premières touches, bouton de souris en tête (« CLIC GAUCHE/X »). */
    hintFor: function (action, n) {
      var all = state.keys[action], mouse = all.filter(function (c) { return /^Mouse/.test(c); }), keys = all.filter(function (c) { return !/^Mouse/.test(c); });
      return mouse.slice(0, 1).concat(keys).slice(0, n || 2).map(ascii).join("/") || "?";
    },
    /** Lie une touche à une action. Si elle servait à une autre action, elle lui est retirée (`moved`). */
    bind: function (action, code) {
      if (!state.keys[action]) return { ok: false, reason: "Action inconnue." };
      if (typeof code !== "string" || !VALID.test(code)) return { ok: false, reason: "Touche non reconnue." };
      if (BLOCKED.test(code)) return { ok: false, reason: "Cette touche est réservée." };
      if (state.keys[action].indexOf(code) >= 0) return { ok: true, moved: null };
      if (state.keys[action].length >= MAX_BINDS) return { ok: false, reason: "Déjà " + MAX_BINDS + " touches pour cette action : retires-en une d'abord." };
      var moved = lookup(code);
      if (moved) state.keys[moved] = state.keys[moved].filter(function (c) { return c !== code; });
      state.keys[action].push(code);
      save(); bump();
      return { ok: true, moved: moved ? actionLabel(moved) : null };
    },
    unbind: function (action, code) {
      if (!state.keys[action]) return;
      state.keys[action] = state.keys[action].filter(function (c) { return c !== code; });
      save(); bump();
    },
    resetKeys: function () { state.keys = sanitize(null).keys; save(); bump(); },
    resetAll: function () { state = sanitize(null); save(); bump(); },
    subscribe: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    isOpen: function () { return false; },
    open: function () {}, close: function () {}, toggle: function () {}, mountButton: function () {},
    _sanitize: sanitize
  };

  load();
  window.OctoSettings = Settings;

  if (typeof document === "undefined" || !document.createElement) return; // Node (tests) : pas d'interface

  /* ---------- disposition du clavier (pour afficher la vraie lettre) ---------- */

  window.addEventListener("keydown", function (e) {
    if (e.key && e.key.length === 1 && e.code && seen[e.code] !== e.key.toUpperCase()) { seen[e.code] = e.key.toUpperCase(); }
  }, { passive: true });
  try {
    if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(function (m) { layout = m; bump(); }, function () {});
  } catch { /* indisponible */ }

  /* ---------- interface ---------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function typing(e) { return e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName); }
  function music() { return window.OctoMusic || null; }

  var TABS = [["keys", "Touches"], ["sound", "Son"], ["screen", "Affichage"], ["game", "Jeu"]];
  var overlay = null, bodyEl = null, tabsEl = null, msgEl = null, closeBtn = null, openState = false, tab = "keys", capturing = null, lastFocus = null, confirmReset = false;

  function say(text, bad) { if (msgEl) { msgEl.textContent = text || ""; msgEl.classList.toggle("is-bad", !!bad); } }

  function toggleRow(name, title, desc, onChange) {
    var row = el("div", "octo-set__row"), txt = el("div", "octo-set__txt");
    txt.appendChild(el("strong", "", title)); if (desc) txt.appendChild(el("span", "octo-set__desc", desc));
    var b = el("button", "octo-set__switch"); b.type = "button"; b.setAttribute("role", "switch");
    function paint() { var on = !!Settings.get(name); b.setAttribute("aria-checked", on ? "true" : "false"); b.textContent = on ? "OUI" : "NON"; b.classList.toggle("is-on", on); }
    b.addEventListener("click", function () { Settings.set(name, !Settings.get(name)); paint(); if (onChange) onChange(); });
    paint(); row.appendChild(txt); row.appendChild(b);
    return row;
  }

  function button(text, cls, fn) {
    var b = el("button", "octo-set__btn " + (cls || ""), text); b.type = "button"; b.addEventListener("click", fn);
    return b;
  }

  /* ----- onglet Touches ----- */

  function stopCapture() {
    if (!capturing) return;
    window.removeEventListener("keydown", capturing.onKey, true);
    window.removeEventListener("mousedown", capturing.onMouse, true);
    window.removeEventListener("contextmenu", capturing.onMenu, true);
    capturing = null;
  }

  function startCapture(action, addBtn) {
    stopCapture();
    function finish(code) {
      var r = Settings.bind(action, code);
      stopCapture();
      if (!r.ok) say(r.reason, true);
      else say(label(code) + " → " + actionLabel(action) + (r.moved ? " (retirée de « " + r.moved + " »)" : ""), false);
      render();
    }
    capturing = {
      onKey: function (e) {
        e.preventDefault(); e.stopPropagation();
        if (e.code === "Escape") { stopCapture(); say(""); render(); return; }
        if (e.repeat) return;
        if (BLOCKED.test(e.code)) { say("Cette touche est réservée.", true); return; }
        finish(e.code);
      },
      onMouse: function (e) {
        if (e.target.closest && e.target.closest("[data-cancel]")) return;
        e.preventDefault(); e.stopPropagation();
        finish("Mouse" + e.button);
      },
      onMenu: function (e) { e.preventDefault(); }
    };
    window.addEventListener("keydown", capturing.onKey, true);
    window.addEventListener("mousedown", capturing.onMouse, true);
    window.addEventListener("contextmenu", capturing.onMenu, true);
    addBtn.textContent = "Appuie sur une touche ou un bouton de souris…";
    addBtn.classList.add("is-wait");
    addBtn.setAttribute("data-cancel", "1");
    say("Échap pour annuler.");
  }

  function renderKeys() {
    bodyEl.appendChild(el("p", "octo-set__lead", "Clique sur « + » puis appuie sur la touche (ou le bouton de souris) de ton choix. Jusqu'à " + MAX_BINDS + " par action ; une touche déjà utilisée est reprise à l'autre action."));
    ACTIONS.forEach(function (a) {
      var row = el("div", "octo-set__row octo-set__row--keys"), txt = el("div", "octo-set__txt");
      txt.appendChild(el("strong", "", a.label));
      if (a.note) txt.appendChild(el("span", "octo-set__desc", a.note));
      var chips = el("div", "octo-set__chips");
      Settings.keys(a.id).forEach(function (c) {
        var chip = el("span", "octo-set__chip"); chip.appendChild(el("span", "", label(c)));
        var x = el("button", "octo-set__chipx", "×"); x.type = "button"; x.setAttribute("aria-label", "Retirer " + label(c));
        x.addEventListener("click", function () { Settings.unbind(a.id, c); say(label(c) + " retirée de « " + a.label + " »."); render(); });
        chip.appendChild(x); chips.appendChild(chip);
      });
      if (!Settings.keys(a.id).length) chips.appendChild(el("span", "octo-set__none", "aucune touche"));
      if (Settings.keys(a.id).length < MAX_BINDS) {
        var add = el("button", "octo-set__add", "+"); add.type = "button"; add.setAttribute("aria-label", "Ajouter une touche : " + a.label);
        add.addEventListener("click", function () { startCapture(a.id, add); });
        chips.appendChild(add);
      }
      row.appendChild(txt); row.appendChild(chips); bodyEl.appendChild(row);
    });
    var foot = el("div", "octo-set__actions");
    foot.appendChild(button("Touches par défaut", "", function () { Settings.resetKeys(); say("Touches remises par défaut."); render(); }));
    bodyEl.appendChild(foot);
    bodyEl.appendChild(el("p", "octo-set__lead octo-set__lead--small", "Fixe : Échap ouvre / ferme ce menu. Sur tactile, les boutons à l'écran restent disponibles."));
  }

  /* ----- onglet Son ----- */

  function renderSound() {
    var m = music();
    var row = el("div", "octo-set__row"), txt = el("div", "octo-set__txt");
    txt.appendChild(el("strong", "", "Musique")); txt.appendChild(el("span", "octo-set__desc", "Synthétisée dans ton navigateur, sans fichier audio."));
    var sw = el("button", "octo-set__switch"); sw.type = "button"; sw.setAttribute("role", "switch");
    function paint() { var on = m && !m.isMuted(); sw.setAttribute("aria-checked", on ? "true" : "false"); sw.textContent = on ? "OUI" : "NON"; sw.classList.toggle("is-on", !!on); }
    sw.addEventListener("click", function () {
      if (!m) return;
      if (!m.isMuted() && !m.isRunning()) m.unlock(); else m.toggle();
      paint(); document.dispatchEvent(new CustomEvent("octo:audio"));
    });
    paint(); row.appendChild(txt); row.appendChild(sw); bodyEl.appendChild(row);

    var vrow = el("div", "octo-set__row"), vt = el("div", "octo-set__txt");
    vt.appendChild(el("strong", "", "Volume")); var out = el("span", "octo-set__desc", "");
    vt.appendChild(out);
    var range = el("input", "octo-set__range"); range.type = "range"; range.min = "0"; range.max = "100"; range.step = "5";
    range.setAttribute("aria-label", "Volume");
    range.value = String(Math.round((m ? m.getVolume() : 0.7) * 100)); out.textContent = range.value + " %";
    range.addEventListener("input", function () {
      out.textContent = range.value + " %";
      if (!m) return;
      m.setVolume(range.value / 100);
      if (m.isMuted() && range.value > 0) m.toggle(); else if (!m.isRunning() && !m.isMuted()) m.unlock();
      paint(); document.dispatchEvent(new CustomEvent("octo:audio"));
    });
    vrow.appendChild(vt); vrow.appendChild(range); bodyEl.appendChild(vrow);

    bodyEl.appendChild(toggleRow("sfx", "Effets sonores", "Sauts, coups, pièces… (la musique reste réglée à part)."));
    var test = el("div", "octo-set__actions");
    test.appendChild(button("Écouter un effet", "", function () { if (m) { m.unlock(); m.sfx("bit"); } }));
    bodyEl.appendChild(test);
  }

  /* ----- onglet Affichage ----- */

  function renderScreen() {
    bodyEl.appendChild(toggleRow("shake", "Secousses de l'écran", "Désactive-les si elles te gênent."));
    bodyEl.appendChild(toggleRow("hints", "Aide des touches à l'écran", "Rappel des commandes au début de chaque trajet."));

    var row = el("div", "octo-set__row"), txt = el("div", "octo-set__txt");
    txt.appendChild(el("strong", "", "Boutons tactiles")); txt.appendChild(el("span", "octo-set__desc", "Automatique : visibles sur téléphone et tablette."));
    var seg = el("div", "octo-set__seg"); seg.setAttribute("role", "group");
    [["auto", "Auto"], ["on", "Toujours"], ["off", "Jamais"]].forEach(function (o) {
      var b = el("button", "octo-set__segbtn", o[1]); b.type = "button";
      b.classList.toggle("is-on", Settings.get("pad") === o[0]);
      b.addEventListener("click", function () { Settings.set("pad", o[0]); render(); });
      seg.appendChild(b);
    });
    row.appendChild(txt); row.appendChild(seg); bodyEl.appendChild(row);

    if (document.fullscreenEnabled) {
      var frow = el("div", "octo-set__row"), ft = el("div", "octo-set__txt");
      ft.appendChild(el("strong", "", "Plein écran"));
      var fb = button(document.fullscreenElement ? "Quitter" : "Activer", "", function () {
        var p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
        if (p && p.then) p.then(function () { render(); }, function () { say("Le plein écran n'est pas disponible ici.", true); });
      });
      frow.appendChild(ft); frow.appendChild(fb); bodyEl.appendChild(frow);
    }
  }

  /* ----- onglet Jeu ----- */

  function reloadFresh() {
    try { window.history.replaceState(null, "", window.location.pathname); } catch { /* ignoré */ }
    window.location.reload();
  }

  function renderGame() {
    bodyEl.appendChild(toggleRow("relax", "Mode détente", "Les ennemis et les pics ne te font plus de dégâts : tu te concentres sur le code."));
    bodyEl.appendChild(toggleRow("skipAlways", "« Passer le trajet » toujours visible", "Sinon il apparaît après quelques échecs."));

    var P = window.OctoProgress;
    if (P && P.exportSave) {
      var save = el("div", "octo-set__block");
      save.appendChild(el("strong", "", "Sauvegarde"));
      save.appendChild(el("span", "octo-set__desc", "Ta progression reste dans ce navigateur. Copie ce code pour la garder ou la reprendre ailleurs."));
      var ta = el("textarea", "octo-set__ta"); ta.rows = 3; ta.spellcheck = false; ta.value = P.exportSave();
      ta.setAttribute("aria-label", "Code de sauvegarde");
      ta.addEventListener("focus", function () { ta.select(); });
      var acts = el("div", "octo-set__actions");
      acts.appendChild(button("Copier", "", function () {
        ta.select();
        var done = function () { say("Code copié."); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, function () { document.execCommand && document.execCommand("copy"); done(); });
        else { try { document.execCommand("copy"); } catch { /* ignoré */ } done(); }
      }));
      acts.appendChild(button("Charger ce code", "", function () {
        var r = P.importSave(ta.value);
        if (r.ok) { say("Sauvegarde chargée."); render(); } else say(r.error, true);
      }));
      save.appendChild(ta); save.appendChild(acts); bodyEl.appendChild(save);
    }

    var danger = el("div", "octo-set__block octo-set__block--danger");
    danger.appendChild(el("strong", "", "Réinitialiser"));
    var a2 = el("div", "octo-set__actions");
    a2.appendChild(button("Réglages par défaut", "", function () { Settings.resetAll(); say("Réglages remis par défaut."); render(); }));
    if (!confirmReset) {
      a2.appendChild(button("Recommencer le jeu à zéro…", "octo-set__btn--danger", function () { confirmReset = true; render(); }));
    } else {
      a2.appendChild(button("Oui, tout effacer", "octo-set__btn--danger", function () {
        if (P) P.reset();
        confirmReset = false;
        reloadFresh();
      }));
      a2.appendChild(button("Annuler", "", function () { confirmReset = false; render(); }));
      danger.appendChild(el("span", "octo-set__desc octo-set__desc--warn", "Ça efface tes niveaux terminés et tes succès (pas tes réglages). Le jeu reprend au niveau 1."));
    }
    danger.appendChild(a2); bodyEl.appendChild(danger);
  }

  function render() {
    if (!overlay) return;
    stopCapture();
    bodyEl.textContent = "";
    Array.prototype.forEach.call(tabsEl.children, function (b) {
      var on = b.getAttribute("data-tab") === tab;
      b.classList.toggle("is-on", on); b.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (tab === "keys") renderKeys(); else if (tab === "sound") renderSound(); else if (tab === "screen") renderScreen(); else renderGame();
  }

  function build() {
    overlay = el("div", "octo-set");
    overlay.setAttribute("role", "dialog"); overlay.setAttribute("aria-modal", "true"); overlay.setAttribute("aria-label", "Réglages");
    var card = el("div", "octo-set__card");
    var head = el("div", "octo-set__head");
    head.appendChild(el("h2", "octo-set__title", "RÉGLAGES"));
    closeBtn = el("button", "octo-set__x", "✕"); closeBtn.type = "button"; closeBtn.setAttribute("aria-label", "Fermer les réglages");
    closeBtn.addEventListener("click", function () { Settings.close(); });
    head.appendChild(closeBtn);
    tabsEl = el("div", "octo-set__tabs"); tabsEl.setAttribute("role", "tablist");
    TABS.forEach(function (t) {
      var b = el("button", "octo-set__tab", t[1]); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("data-tab", t[0]);
      b.addEventListener("click", function () { tab = t[0]; say(""); confirmReset = false; render(); });
      tabsEl.appendChild(b);
    });
    msgEl = el("div", "octo-set__msg"); msgEl.setAttribute("aria-live", "polite");
    bodyEl = el("div", "octo-set__body");
    var foot = el("div", "octo-set__foot");
    foot.appendChild(el("span", "", "Échap : ouvrir / fermer · la partie est en pause"));
    foot.appendChild(button("Fermer", "octo-set__btn--ok", function () { Settings.close(); }));
    card.appendChild(head); card.appendChild(tabsEl); card.appendChild(msgEl); card.appendChild(bodyEl); card.appendChild(foot);
    overlay.appendChild(card);
    overlay.addEventListener("pointerdown", function (e) { if (e.target === overlay && !capturing) Settings.close(); });
  }

  Settings.isOpen = function () { return openState; };
  Settings.open = function (parent) {
    if (openState) return;
    if (!overlay) build();
    var host = parent || (overlay.parentNode && overlay.parentNode !== document.body ? overlay.parentNode : null) || document.querySelector(".octo-fs") || document.body;
    host.appendChild(overlay);
    lastFocus = document.activeElement;
    openState = true; confirmReset = false; say("");
    overlay.classList.add("is-open");
    render();
    try { closeBtn.focus({ preventScroll: true }); } catch { /* ignoré */ }
    document.dispatchEvent(new CustomEvent("octo:settings", { detail: { open: true } }));
  };
  Settings.close = function () {
    if (!openState) return;
    stopCapture();
    openState = false;
    overlay.classList.remove("is-open");
    if (lastFocus && lastFocus.blur) lastFocus.blur();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    document.dispatchEvent(new CustomEvent("octo:settings", { detail: { open: false } }));
  };
  Settings.toggle = function () { if (openState) Settings.close(); else Settings.open(); };

  Settings.mountButton = function (container) {
    var gear = el("button", "octo-mute octo-gear", "⚙");
    gear.type = "button"; gear.setAttribute("aria-label", "Réglages (Échap)"); gear.title = "Réglages (Échap)";
    gear.addEventListener("click", function () { if (openState) Settings.close(); else Settings.open(container.parentNode); gear.blur(); });
    container.appendChild(gear);
    if (overlay && overlay.parentNode !== container.parentNode && !openState) container.parentNode.appendChild(overlay);
    return gear;
  };

  window.addEventListener("keydown", function (e) {
    if (e.code !== "Escape" || capturing || e.repeat) return;
    if (typing(e) && !openState) return; // dans l'éditeur de code, Échap ne dérange pas la frappe
    e.preventDefault();
    Settings.toggle();
  });
  window.addEventListener("blur", stopCapture);
})();
