/* OctoCat-Code — Moteur de jeu : une seule page, un canvas KAPLAY plein écran, des scènes.
 *
 * API publique : window.gameEngine
 *   registerScene(name, def)  scène autonome (le menu) : def.scene(k, h, ctx) -> { reset() }
 *   registerLevel(def)        niveau jouable (voir level1.js)
 *   on(event, cb)             'compile' | 'success' | 'fail' | 'hint'
 *   interpreter.run(code)     mini-interpréteur sécurisé (aucun eval)
 *   validators.*              regex / qcm / keywords / assignment
 *
 * Contrat d'un niveau :
 *   { id, title, zone, starter, hints[], briefing{ title, lore, lesson, examples, tips[], goal },
 *     validate(code, engine) -> {ok, messages[], data},
 *     scene(k, h, ctx) -> { success(result): Promise, fail(result): Promise, reset() } }
 * ctx = { go(sceneName), reserve (part basse de l'écran laissée à l'éditeur) }.
 */
(function () {
  "use strict";

  /* ======================================================================
   * 1. Mini-interpréteur sécurisé
   * Sous-ensemble commun à Python / JavaScript : affectations de variables,
   * nombres, chaînes, + - * / % et parenthèses. Jamais d'eval ni de Function.
   * ==================================================================== */

  function stripComment(line) {
    var q = null;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (q) { if (ch === q && line[i - 1] !== "\\") q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; }
      if (ch === "#") return line.slice(0, i);
      if (ch === "/" && line[i + 1] === "/") return line.slice(0, i);
    }
    return line;
  }

  function splitStatements(line) {
    var out = [], cur = "", q = null;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (q) { cur += ch; if (ch === q && line[i - 1] !== "\\") q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
      if (ch === ";") { out.push(cur); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur);
    return out.map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function tokenize(src) {
    var tokens = [], i = 0, m;
    while (i < src.length) {
      var rest = src.slice(i);
      if ((m = /^\s+/.exec(rest))) { i += m[0].length; continue; }
      if ((m = /^\d+(\.\d+)?/.exec(rest))) { tokens.push({ t: "num", v: parseFloat(m[0]) }); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) { tokens.push({ t: "id", v: m[0] }); i += m[0].length; continue; }
      if ((m = /^("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/.exec(rest))) {
        tokens.push({ t: "str", v: m[0].slice(1, -1) }); i += m[0].length; continue;
      }
      if ("+-*/%()".indexOf(rest[0]) >= 0) { tokens.push({ t: "op", v: rest[0] }); i++; continue; }
      throw new Error("caractère inattendu « " + rest[0] + " »");
    }
    return tokens;
  }

  function evalExpr(src, vars) {
    var toks = tokenize(src), p = 0;
    if (!toks.length) throw new Error("expression vide après « = »");
    function peek() { return toks[p]; }
    function isOp(v) { return peek() && peek().t === "op" && peek().v === v; }

    function atom() {
      var t = toks[p++];
      if (!t) throw new Error("expression incomplète");
      if (t.t === "num" || t.t === "str") return t.v;
      if (t.t === "id") {
        if (!Object.prototype.hasOwnProperty.call(vars, t.v)) throw new Error("« " + t.v + " » n'est pas défini");
        return vars[t.v];
      }
      if (t.v === "(") {
        var v = sum();
        if (!isOp(")")) throw new Error("parenthèse fermante « ) » manquante");
        p++;
        return v;
      }
      if (t.v === "-") return -num(atom());
      throw new Error("« " + t.v + " » est inattendu ici");
    }
    function num(v) { if (typeof v !== "number") throw new Error("opération impossible sur du texte"); return v; }
    function prod() {
      var v = atom();
      while (isOp("*") || isOp("/") || isOp("%")) {
        var o = toks[p++].v, r = atom();
        if (o === "*") v = num(v) * num(r);
        else if (num(r) === 0) throw new Error("division par zéro");
        else v = o === "/" ? num(v) / r : num(v) % r;
      }
      return v;
    }
    function sum() {
      var v = prod();
      while (isOp("+") || isOp("-")) {
        var o = toks[p++].v, r = prod();
        if (o === "+") v = (typeof v === "string" || typeof r === "string") ? String(v) + String(r) : v + r;
        else v = num(v) - num(r);
      }
      return v;
    }
    var result = sum();
    if (p < toks.length) throw new Error("« " + toks[p].v + " » est inattendu ici");
    return result;
  }

  var ASSIGN = /^(?:(?:let|const|var)\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(\+=|-=|\*=|\/=|=(?!=))\s*(.*)$/;

  /** Exécute `code` et renvoie { vars, errors:[{line, msg}], statements }. */
  function run(code, env) {
    var vars = Object.assign({}, env || {}), errors = [], count = 0;
    String(code).split(/\r?\n/).forEach(function (raw, idx) {
      var line = idx + 1;
      splitStatements(stripComment(raw)).forEach(function (stmt) {
        var m = ASSIGN.exec(stmt);
        if (!m) {
          var cmp = /^[A-Za-z_]\w*\s*==/.exec(stmt);
          errors.push({
            line: line,
            msg: cmp ? "« == » compare deux valeurs ; pour donner une valeur à une variable, utilise un seul « = »."
              : "instruction non reconnue : « " + stmt + " »"
          });
          return;
        }
        try {
          var val = evalExpr(m[3], vars);
          if (m[2] !== "=") {
            if (!Object.prototype.hasOwnProperty.call(vars, m[1])) throw new Error("« " + m[1] + " » n'est pas défini");
            val = evalExpr(m[1] + m[2][0] + "(" + m[3] + ")", vars);
          }
          vars[m[1]] = val;
          count++;
        } catch (e) {
          errors.push({ line: line, msg: e.message });
        }
      });
    });
    return { vars: vars, errors: errors, statements: count };
  }

  /* ======================================================================
   * 2. Validateurs (zones 1, 2 et 3)
   * ==================================================================== */

  var validators = {
    /** Zone 1 : correspondance par expression régulière. */
    regex: function (code, re) {
      return { ok: re.test(code.trim()) };
    },
    /** Zone 1 : QCM — `answer` est l'index attendu. */
    qcm: function (choice, answer) {
      return { ok: choice === answer };
    },
    /** Zones 2/3 : mots-clés requis / interdits (while, if, for…). */
    keywords: function (code, opts) {
      var src = code.split(/\r?\n/).map(stripComment).join("\n");
      var missing = (opts.required || []).filter(function (w) { return !new RegExp("\\b" + w + "\\b").test(src); });
      var forbidden = (opts.forbidden || []).filter(function (w) { return new RegExp("\\b" + w + "\\b").test(src); });
      return { ok: !missing.length && !forbidden.length, missing: missing, forbidden: forbidden };
    },
    /** Vérifie qu'une variable vaut la valeur attendue après exécution. */
    assignment: function (code, name, expected) {
      var res = run(code);
      var has = Object.prototype.hasOwnProperty.call(res.vars, name);
      return {
        ok: !res.errors.length && has && res.vars[name] === expected,
        run: res, defined: has, value: res.vars[name]
      };
    }
  };

  /* ======================================================================
   * 3. Moteur : une seule page, un seul canvas plein écran, plusieurs scènes
   *    (hub + niveaux) et une interface de jeu en surimpression (briefing, éditeur, console).
   * ==================================================================== */

  var levels = {};
  var scenes = {};
  var listeners = {};
  var mounted = [];

  function emit(ev, payload) { (listeners[ev] || []).forEach(function (cb) { try { cb(payload); } catch (e) { console.error(e); } }); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function wait(k, s) { return new Promise(function (res) { k.wait(s, res); }); }

  /** Interpolation sur `dur` secondes ; fn(eased, raw) est appelée à chaque frame. */
  function tween(k, dur, fn, ease) {
    ease = ease || function (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; };
    return new Promise(function (res) {
      var t = 0, c;
      c = k.onUpdate(function () {
        t += k.dt();
        var p = Math.min(t / dur, 1);
        fn(ease(p), p);
        if (p >= 1) { c.cancel(); res(); }
      });
    });
  }

  /* ---------- Interface de jeu (HTML en surimpression du canvas) ---------- */

  function createUI(host, hooks) {
    var root = el("div", "octo-ui");
    // --- fenêtre de briefing / dialogue ---
    var dialog = el("div", "octo-dialog"), card = el("div", "octo-dialog__card");
    dialog.appendChild(card);
    // --- panneau de code ---
    var panel = el("div", "octo-panel");
    var bar = el("div", "octo-panel__bar"), title = el("span", "octo-panel__title"), goal = el("span", "octo-panel__goal");
    bar.appendChild(title); bar.appendChild(goal);
    var editor = el("textarea", "octo-editor");
    editor.spellcheck = false;
    editor.setAttribute("autocapitalize", "off");
    editor.setAttribute("aria-label", "Éditeur de code");
    var actions = el("div", "octo-actions");
    var bCompile = el("button", "octo-btn octo-btn--primary", "⚡ Compiler");
    var bReset = el("button", "octo-btn", "↺ Réinitialiser");
    var bHint = el("button", "octo-btn", "💡 Indice");
    var bBrief = el("button", "octo-btn", "📜 Briefing");
    var bMenu = el("button", "octo-btn octo-btn--right", "⌂ Menu");
    [bCompile, bReset, bHint, bBrief, bMenu].forEach(function (b) { b.type = "button"; actions.appendChild(b); });
    var konsole = el("pre", "octo-console");
    konsole.setAttribute("aria-live", "polite");
    panel.appendChild(bar); panel.appendChild(editor); panel.appendChild(actions); panel.appendChild(konsole);
    root.appendChild(dialog); root.appendChild(panel);
    host.appendChild(root);

    var hintIdx = 0, def = null;

    function log(text, kind) {
      konsole.appendChild(el("div", "octo-console__line" + (kind ? " octo-console__line--" + kind : ""), text));
      konsole.scrollTop = konsole.scrollHeight;
    }

    function show(node, on) { node.classList.toggle("is-open", !!on); }

    function openBriefing(then) {
      var b = def.briefing || {};
      card.textContent = "";
      card.appendChild(el("h2", "octo-dialog__title", b.title || def.title));
      if (b.lore) card.appendChild(el("p", "octo-dialog__lore", b.lore));
      if (b.lesson) card.appendChild(el("p", "octo-dialog__text", b.lesson));
      if (b.examples) {
        var tabs = el("div", "octo-tabs"), code = el("pre", "octo-dialog__code");
        Object.keys(b.examples).forEach(function (name, i) {
          var t = el("button", "octo-tab" + (i === 0 ? " is-on" : ""), name);
          t.type = "button";
          t.addEventListener("click", function () {
            Array.prototype.forEach.call(tabs.children, function (x) { x.classList.remove("is-on"); });
            t.classList.add("is-on"); code.textContent = b.examples[name];
            if (name === "Python" || name === "JavaScript") window.OctoProgress.setLanguage(name);
          });
          tabs.appendChild(t);
          if (i === 0) code.textContent = b.examples[name];
        });
        card.appendChild(tabs); card.appendChild(code);
      }
      (b.tips || []).forEach(function (t) { card.appendChild(el("p", "octo-dialog__tip", "▸ " + t)); });
      if (b.goal) card.appendChild(el("p", "octo-dialog__goal", "OBJECTIF : " + b.goal));
      var go = el("button", "octo-btn octo-btn--primary", def.comingSoon ? "◂ RETOUR AU MENU" : "COMMENCER ▶");
      go.type = "button";
      go.addEventListener("click", function () {
        show(dialog, false);
        if (def.comingSoon) hooks.menu(); else { show(panel, true); editor.focus(); }
        if (then) then();
      });
      card.appendChild(go);
      show(dialog, true);
      go.focus();
    }

    function setBusy(b) { bCompile.disabled = b; bReset.disabled = b; }

    bCompile.addEventListener("click", function () { hooks.compile(); });
    bMenu.addEventListener("click", function () { hooks.menu(); });
    bReset.addEventListener("click", function () {
      editor.value = def.starter; konsole.textContent = "";
      log("// Code réinitialisé.", "dim");
      hooks.reset();
    });
    bBrief.addEventListener("click", function () { show(panel, false); openBriefing(function () { show(panel, true); }); });
    bHint.addEventListener("click", function () {
      var hints = def.hints || [];
      if (!hints.length) return;
      log("💡 Indice " + (hintIdx % hints.length + 1) + "/" + hints.length + " : " + hints[hintIdx % hints.length], "hint");
      hintIdx++;
      window.OctoProgress.grant("curious");
      emit("hint", { level: def.id });
    });
    editor.addEventListener("keydown", function (e) {
      if (e.key === "Tab" && !e.shiftKey) { // indentation plutôt que perte de focus
        e.preventDefault();
        var s = editor.selectionStart, t = editor.selectionEnd;
        editor.value = editor.value.slice(0, s) + "  " + editor.value.slice(t);
        editor.selectionStart = editor.selectionEnd = s + 2;
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); hooks.compile();
      }
    });

    return {
      log: log, setBusy: setBusy,
      clearLog: function () { konsole.textContent = ""; },
      code: function () { return editor.value; },
      /** Hub : aucune interface. */
      hide: function () { show(dialog, false); show(panel, false); def = null; },
      /** Niveau : briefing d'abord, puis éditeur. */
      showLevel: function (d) {
        def = d; hintIdx = 0;
        title.textContent = "NIVEAU " + d.id + " · " + d.title;
        goal.textContent = (d.briefing && d.briefing.goal) || "";
        editor.value = d.starter || "";
        editor.rows = Math.max(4, (d.starter || "").split("\n").length + 1);
        konsole.textContent = "";
        log("// Écris ta solution puis clique sur « Compiler » (Ctrl+Entrée).", "dim");
        setBusy(false); show(panel, false);
        openBriefing();
      }
    };
  }

  /* ---------- Jeu : KAPLAY plein écran + scènes ---------- */

  function startGame(host) {
    if (typeof window.kaplay !== "function") {
      host.appendChild(el("p", "octo-hero__error", "KAPLAY n'a pas pu être chargé : le jeu est indisponible."));
      return null;
    }
    var canvas = el("canvas", "octo-canvas");
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "OctoCat-Code : un jeu d'aventure pour apprendre à programmer");
    var stage = el("div", "octo-stage");
    stage.appendChild(canvas); host.appendChild(stage);

    // Hauteur logique selon le format de la fenêtre : le monde (600 de large) tient toujours en entier.
    var dpr = window.devicePixelRatio || 1;
    var aspect = window.innerWidth / window.innerHeight;
    var H = Math.round(Math.min(360, Math.max(250, 600 / aspect)));
    var W = Math.max(200, Math.round(H * aspect));
    var k = window.kaplay({
      canvas: canvas, width: W, height: H, global: false,
      background: [13, 17, 23], crisp: true, texFilter: "nearest",
      focus: false, debug: false, touchToMouse: false,
      pixelDensity: Math.min(6, Math.max(1, window.innerHeight * dpr / H))
    });
    canvas.style.width = "100%"; canvas.style.height = "100%";
    window.OctoSprites.registerAll(k);
    var helpers = {
      wait: function (s) { return wait(k, s); },
      tween: function (d, fn, e) { return tween(k, d, fn, e); },
      palette: window.OctoSprites.palette
    };

    var P = window.OctoProgress, cur = { name: null, def: null, ctrl: null }, busy = false;

    function nextName(id) { return levels[id + 1] ? "level" + (id + 1) : "hub"; }

    function goTo(name) {
      if (/^level\d+$/.test(name) && !P.isUnlocked(parseInt(name.slice(5), 10))) name = "hub";
      busy = false;
      try { window.history.replaceState(null, "", name === "hub" ? window.location.pathname : "#" + name); } catch { /* ignoré */ }
      k.go(name);
    }

    var ui = createUI(host, {
      menu: function () { goTo("hub"); },
      reset: function () { if (cur.ctrl && cur.ctrl.reset) cur.ctrl.reset(); },
      compile: function () {
        var def = cur.def;
        if (busy || !def || !def.validate || !cur.ctrl) return;
        emit("compile", { level: def.id });
        ui.clearLog();
        ui.log("$ octo-compile niveau-" + def.id, "dim");
        var result;
        try { result = def.validate(ui.code(), api); }
        catch (e) { result = { ok: false, messages: ["Erreur interne du validateur : " + e.message] }; }
        (result.messages || []).forEach(function (m) { ui.log(m, result.ok ? "ok" : "err"); });
        busy = true; ui.setBusy(true);
        if (result.ok) {
          var gained = P.complete(def.id);
          ui.log("✔ Compilation réussie.", "ok");
          gained.forEach(function (key) { ui.log("🏆 Succès débloqué : " + P.achievements[key].title, "gold"); });
          emit("success", { level: def.id, result: result });
          cur.ctrl.success(result).then(function () {
            ui.log(levels[def.id + 1] ? "→ Le portail s'ouvre vers le niveau suivant…" : "→ Retour au menu…", "dim");
            window.setTimeout(function () { goTo(nextName(def.id)); }, 600);
          });
        } else {
          P.recordFail(def.id);
          ui.log("✗ Compilation échouée.", "err");
          emit("fail", { level: def.id, result: result });
          cur.ctrl.fail(result).then(function () { busy = false; ui.setBusy(false); });
        }
      }
    });

    function enter(name, def, isLevel) {
      cur.name = name; cur.def = def; cur.ctrl = null;
      var ctx = { go: goTo, host: host, name: name, reserve: isLevel ? 0.4 : 0 };
      cur.ctrl = def.scene(k, helpers, ctx);
      if (isLevel) ui.showLevel(def); else { ui.hide(); canvas.focus(); }
    }

    Object.keys(scenes).forEach(function (name) { k.scene(name, function () { enter(name, scenes[name], false); }); });
    Object.keys(levels).forEach(function (id) { k.scene("level" + id, function () { enter("level" + id, levels[id], true); }); });

    // Reprise : #levelN rouvre le niveau (s'il est débloqué), sinon on démarre au menu.
    var start = /^#level\d+$/.test(window.location.hash) ? window.location.hash.slice(1) : "hub";
    if (/^level\d+$/.test(start) && !(levels[start.slice(5)] && P.isUnlocked(parseInt(start.slice(5), 10)))) start = "hub";
    k.onLoad(function () { k.go(start); });

    // Le format de la fenêtre a changé : on recompose la vue.
    var timer = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        if (Math.abs(window.innerWidth / window.innerHeight / aspect - 1) > 0.06) window.location.reload();
      }, 400);
    });

    host.__kaplay = k;
    return { k: k, goTo: goTo };
  }

  function mountGame(host) {
    if (host.__octo) return;
    host.__octo = true;
    host.classList.add("octo-hero");
    host.innerHTML = "";
    if (startGame(host)) mounted.push(host);
  }

  var api = {
    version: "0.2.0",
    interpreter: { run: run, evalExpr: evalExpr },
    validators: validators,
    registerLevel: function (def) { levels[def.id] = def; },
    registerScene: function (name, def) { scenes[name] = def; },
    on: function (ev, cb) { (listeners[ev] = listeners[ev] || []).push(cb); return api; },
    mount: function () {
      Array.prototype.forEach.call(document.querySelectorAll(".octo-scene[data-fullscreen]"), mountGame);
    },
    get levels() { return levels; },
    get mounted() { return mounted; }
  };

  window.gameEngine = api;

  function boot() { api.mount(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
