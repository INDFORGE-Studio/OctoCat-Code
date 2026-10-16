/* OctoCat-Code — Moteur de jeu : passerelle MkDocs ⇄ KAPLAY + sandbox de validation.
 *
 * API publique : window.gameEngine
 *   registerLevel(def)      déclare un niveau (voir level1.js)
 *   mount()                 monte les <div class="octo-game" data-level="N"> de la page
 *   on(event, cb)           'compile' | 'success' | 'fail' | 'hint'
 *   interpreter.run(code)   mini-interpréteur sécurisé (aucun eval)
 *   validators.*            regex / qcm / keywords / assignment
 *
 * Contrat d'un niveau :
 *   { id, title, starter, hints[], validate(code, engine) -> {ok, messages[], data},
 *     scene(k, h) -> { success(result): Promise, fail(result): Promise, reset() } }
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
   * 3. Moteur : composant canvas + éditeur + passerelle KAPLAY
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

  /** Initialise KAPLAY sur `canvas` et construit la scène `sceneFn(k, helpers)`. Renvoie null sans KAPLAY. */
  function startKaplay(host, canvas, sceneFn, full) {
    if (typeof window.kaplay !== "function") return null;
    var W = 600, H = 250, dpr = window.devicePixelRatio || 1, density = Math.min(dpr, 2);
    if (full) { // plein écran : hauteur logique fixe, largeur selon le format de la fenêtre
      H = 288;
      W = Math.max(200, Math.round(H * window.innerWidth / window.innerHeight));
      density = Math.min(6, Math.max(1, window.innerHeight * dpr / H)); // ~1 pixel logique = n pixels écran entiers
    }
    var k = window.kaplay({
      canvas: canvas, width: W, height: H, global: false,
      background: [13, 17, 23], crisp: true, texFilter: "nearest",
      focus: false, debug: false, touchToMouse: false,
      pixelDensity: density
    });
    // Mode cadre : le ratio 600×250 est conservé par le CSS ; plein écran : le CSS remplit la fenêtre.
    canvas.style.width = "100%"; canvas.style.height = full ? "100%" : "auto";
    canvas.style.touchAction = "pan-y";
    window.OctoSprites.registerAll(k);
    var helpers = {
      wait: function (s) { return wait(k, s); },
      tween: function (d, fn, e) { return tween(k, d, fn, e); },
      palette: window.OctoSprites.palette
    };
    var ctrl = null, ready = false;
    k.scene("level", function () { ctrl = sceneFn(k, helpers); ready = true; });
    k.onLoad(function () { k.go("level"); });
    host.__kaplay = k;
    return { k: k, ready: function () { return ready; }, ctrl: function () { return ctrl; } };
  }

  /** Scène autonome (page d'accueil) : un canvas, pas d'éditeur. */
  function mountScene(host) {
    var name = host.getAttribute("data-scene");
    var def = scenes[name];
    if (!def) { host.textContent = "Scène « " + name + " » introuvable."; return; }
    if (host.__octo) return;
    host.__octo = true;
    host.classList.add("octo-hero");
    host.innerHTML = "";
    var stage = el("div", "octo-stage");
    var canvas = el("canvas", "octo-canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", def.alt || ("Scène " + name));
    stage.appendChild(canvas);
    host.appendChild(stage);
    var handle = startKaplay(host, canvas, function (k, h) {
      return def.scene(k, h, {
        go: function (url) { window.location.href = new URL(url, window.location.href).href; },
        host: host
      });
    }, host.hasAttribute("data-fullscreen"));
    if (host.hasAttribute("data-fullscreen")) { // le format de la fenêtre a changé : on recompose la vue
      var ratio = window.innerWidth / window.innerHeight, timer = null;
      window.addEventListener("resize", function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          if (Math.abs(window.innerWidth / window.innerHeight / ratio - 1) > 0.06) window.location.reload();
        }, 400);
      });
    }
    if (!handle) host.appendChild(el("p", "octo-hero__error", "La scène animée n'a pas pu être chargée."));
    mounted.push(host);
  }

  function mountGame(host) {
    var id = parseInt(host.getAttribute("data-level"), 10);
    var def = levels[id];
    if (!def) { host.textContent = "Niveau " + id + " introuvable."; return; }
    if (host.__octo) return;
    host.__octo = true;

    var next = host.getAttribute("data-next");
    var P = window.OctoProgress;

    // --- DOM (composant réutilisable) ---
    host.classList.add("octo-frame");
    host.innerHTML = "";
    var bar = el("div", "octo-titlebar");
    bar.appendChild(el("span", "octo-titlebar__name", "🐙 Niveau " + id + " — " + def.title));
    bar.appendChild(el("span", "octo-titlebar__tag", "Zone " + (def.zone || 1)));
    var stage = el("div", "octo-stage");
    var canvas = el("canvas", "octo-canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", def.alt || ("Scène du niveau " + id));
    stage.appendChild(canvas);
    var editor = el("textarea", "octo-editor");
    editor.spellcheck = false;
    editor.setAttribute("autocapitalize", "off");
    editor.setAttribute("aria-label", "Éditeur de code");
    editor.value = def.starter;
    editor.rows = Math.max(4, def.starter.split("\n").length + 1);
    var actions = el("div", "octo-actions");
    var bCompile = el("button", "octo-btn octo-btn--primary", "⚡ Compiler");
    var bReset = el("button", "octo-btn", "↺ Réinitialiser");
    var bHint = el("button", "octo-btn", "💡 Indice");
    [bCompile, bReset, bHint].forEach(function (b) { b.type = "button"; actions.appendChild(b); });
    var konsole = el("pre", "octo-console");
    konsole.setAttribute("aria-live", "polite");
    host.appendChild(bar); host.appendChild(stage); host.appendChild(editor);
    host.appendChild(actions); host.appendChild(konsole);

    function log(text, kind) {
      var line = el("div", "octo-console__line" + (kind ? " octo-console__line--" + kind : ""), text);
      konsole.appendChild(line);
      konsole.scrollTop = konsole.scrollHeight;
    }
    log("// Écris ta solution puis clique sur « Compiler » (Ctrl+Entrée).", "dim");

    // --- KAPLAY ---
    var busy = false, hintIdx = 0;
    var stageHandle = startKaplay(host, canvas, def.scene);
    if (!stageHandle) log("✗ KAPLAY n'a pas pu être chargé. La scène est indisponible.", "err");
    // `ctrl` / `ready` sont lus à chaque clic : la scène démarre après le chargement des sprites.
    function ctrlOf() { return stageHandle && stageHandle.ready() ? stageHandle.ctrl() : null; }

    function setBusy(b) { busy = b; bCompile.disabled = b; bReset.disabled = b; }

    function compile() {
      if (busy) return;
      emit("compile", { level: id });
      konsole.innerHTML = "";
      log("$ octo-compile niveau-" + id, "dim");
      var result;
      try { result = def.validate(editor.value, api); }
      catch (e) { result = { ok: false, messages: ["Erreur interne du validateur : " + e.message] }; }

      (result.messages || []).forEach(function (m) { log(m, result.ok ? "ok" : "err"); });
      setBusy(true);
      if (result.ok) {
        var gained = P.complete(id);
        log("✔ Compilation réussie.", "ok");
        gained.forEach(function (key) { log("🏆 Succès débloqué : " + P.achievements[key].title, "gold"); });
        emit("success", { level: id, result: result });
        var anim = ctrlOf() ? ctrlOf().success(result) : Promise.resolve();
        anim.then(function () {
          if (next) {
            log("→ Ouverture du portail vers le niveau suivant…", "dim");
            window.setTimeout(function () { window.location.href = new URL(next, window.location.href).href; }, 400);
          } else {
            log("★ Chapitre terminé !", "gold");
            setBusy(false);
          }
        });
      } else {
        P.recordFail(id);
        log("✗ Compilation échouée.", "err");
        emit("fail", { level: id, result: result });
        var f = ctrlOf() ? ctrlOf().fail(result) : Promise.resolve();
        f.then(function () { setBusy(false); });
      }
    }

    bCompile.addEventListener("click", compile);
    bReset.addEventListener("click", function () {
      editor.value = def.starter; konsole.innerHTML = "";
      log("// Code réinitialisé.", "dim");
      if (ctrlOf() && ctrlOf().reset) ctrlOf().reset();
    });
    bHint.addEventListener("click", function () {
      var hints = def.hints || [];
      if (!hints.length) return;
      log("💡 Indice " + (hintIdx % hints.length + 1) + "/" + hints.length + " : " + hints[hintIdx % hints.length], "hint");
      hintIdx++;
      P.grant("curious");
      emit("hint", { level: id });
    });
    editor.addEventListener("keydown", function (e) {
      if (e.key === "Tab" && !e.shiftKey) { // indentation plutôt que perte de focus
        e.preventDefault();
        var s = editor.selectionStart, t = editor.selectionEnd;
        editor.value = editor.value.slice(0, s) + "  " + editor.value.slice(t);
        editor.selectionStart = editor.selectionEnd = s + 2;
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); compile();
      }
    });

    mounted.push(host);
  }

  var api = {
    version: "0.1.0",
    interpreter: { run: run, evalExpr: evalExpr },
    validators: validators,
    registerLevel: function (def) { levels[def.id] = def; },
    registerScene: function (name, def) { scenes[name] = def; },
    on: function (ev, cb) { (listeners[ev] = listeners[ev] || []).push(cb); return api; },
    mount: function () {
      Array.prototype.forEach.call(document.querySelectorAll(".octo-game[data-level]"), mountGame);
      Array.prototype.forEach.call(document.querySelectorAll(".octo-scene[data-scene]"), mountScene);
    },
    get levels() { return levels; },
    get mounted() { return mounted; }
  };

  window.gameEngine = api;

  function boot() { api.mount(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
