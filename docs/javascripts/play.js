/* OctoCat-Code — Phase « trajet » : affichage, clavier, tactile et effets autour de la simulation (playsim.js).
 * La scène `run<N>` d'un niveau se joue au clavier (flèches / WASD-ZQSD, Espace, X, C) ou avec les boutons tactiles ;
 * à l'arrivée au terminal, le moteur ouvre l'énigme du niveau.
 *
 *   OctoPlay.createRun(k, h, def, hooks) -> { destroy(), skip(), sim }
 *   def.run = { mode: "platform", theme, abilities, course }  |  { mode: "brawl", theme, length, waves }
 */
(function () {
  "use strict";

  var Sim = window.OctoSim, T = Sim.TILE;

  var THEMES = {
    forest: { sky: "#3a47b4", skyTint: "#ffffff", tile: "#ffffff", land: "#ffffff", wash: null, deco: ["tree", "bush", "tuft0", "flower0", "mushroom", "palm", "tuft1", "flower1"] },
    village: { sky: "#4a55c0", skyTint: "#ffe4d0", tile: "#e8d8ff", land: "#fff0e6", wash: ["#f0883e", 0.07], floor: "#4a3a58", deco: ["tree", "sign", "bush", "palm", "torch", "bush", "tree"] },
    mine: { sky: "#150e24", skyTint: "#4a4a78", tile: "#8f9bc8", land: "#3a3f70", wash: ["#0b0716", 0.45], light: "#ffb35a", deco: ["rock", "mushroom", "torch", "rock", "mushroom", "tuft0"] },
    dojo: { sky: "#2a1448", skyTint: "#b070d0", tile: "#d0a8b8", land: "#9060a0", wash: ["#3a1060", 0.2], deco: ["palm", "torch", "tree", "rock", "torch", "bush"] },
    bridge: { sky: "#2d6bc0", skyTint: "#cfeaff", tile: "#ffffff", land: "#d8f0ff", wash: null, deco: ["palm", "bush", "tuft1", "flower1", "tree", "tuft0"] },
    market: { sky: "#8a4a8a", skyTint: "#ffb090", tile: "#ffe2d0", land: "#ffd0c0", wash: ["#ff9f40", 0.08], floor: "#5a3a58", deco: ["sign", "mushroom", "torch", "bush", "sign", "palm"] },
    forge: { sky: "#2a0f14", skyTint: "#b04848", tile: "#c09090", land: "#8a3a3a", wash: ["#f85149", 0.16], light: "#ff8a4a", deco: ["torch", "rock", "torch", "rock", "mushroom"] },
    temple: { sky: "#1a3a5a", skyTint: "#6a9ab8", tile: "#a8d0d8", land: "#6a98b0", wash: ["#39c5cf", 0.1], deco: ["palm", "rock", "torch", "palm", "tuft1"] },
    sort: { sky: "#3a2a6a", skyTint: "#a080e0", tile: "#d8c0f0", land: "#b090e8", wash: ["#bc8cff", 0.1], deco: ["torch", "mushroom", "sign", "rock", "bush"] },
    arena: { sky: "#3a0f20", skyTint: "#d05468", tile: "#d09aa0", land: "#b05068", wash: ["#f85149", 0.14], floor: "#4a2a38", deco: ["torch", "sign", "torch", "rock", "torch"] }
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  /** La police canvas de KAPLAY n'a pas les accents : majuscules sans accents. */
  function plain(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase(); }
  /** Teinte 0..1 → couleur arc-en-ciel (saturation s, valeur 1), en hexadécimal. */
  function rainbowHex(hue, s) {
    var h6 = (((hue % 1) + 1) % 1) * 6, i = Math.floor(h6), f = h6 - i, q = 1 - s * f, t = 1 - s * (1 - f), p = 1 - s, rgb3;
    rgb3 = [[1, t, p], [q, 1, p], [p, 1, t], [p, q, 1], [t, p, 1], [1, p, q]][i % 6];
    return "#" + rgb3.map(function (v) { var n = Math.round(v * 255); return (n < 16 ? "0" : "") + n.toString(16); }).join("");
  }
  function music() { return window.OctoMusic || { sfx: function () {}, setMood: function () {}, setBattle: function () {} }; }

  /* ---------- entrées : clavier + boutons tactiles ---------- */

  // Les touches viennent des réglages (menu ⚙) ; les codes sont physiques : WASD = ZQSD, valables pour tous les claviers.
  var FALLBACK_KEYS = {
    ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up",
    ArrowDown: "down", KeyS: "down", Space: "jump", KeyX: "attack", KeyJ: "attack", KeyC: "throw", KeyK: "throw", Mouse0: "attack", Mouse2: "dog", KeyV: "dog"
  };
  function settings() { return window.OctoSettings || null; }
  function actionOf(code) { var S = settings(); return S ? S.lookup(code) : FALLBACK_KEYS[code] || null; }
  function menuOpen() { var S = settings(); return !!(S && S.isOpen()); }

  function createInput(brawl) {
    var kb = {}, pad = {}, latch = {}; // latch : un appui plus court qu'une image (clic rapide, tape) compte quand même
    function typing(e) { return e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName); }
    function reset() { kb = {}; pad = {}; latch = {}; }
    function onKey(down) {
      return function (e) {
        if (menuOpen()) { if (!down) kb = {}; return; } // le menu ⚙ garde les touches pour lui
        var a = actionOf(e.code);
        if (!a || typing(e)) return;
        kb[a] = down; if (down) latch[a] = true;
        e.preventDefault();
      };
    }
    var kd = onKey(true), ku = onKey(false);
    // Souris : les boutons se lient comme des touches (par défaut clic gauche = frapper, clic droit = appeler Laita).
    // Seuls les clics sur le canvas comptent ; le tactile garde ses boutons à l'écran.
    function onMouse(down) {
      return function (e) {
        if (e.pointerType !== "mouse" || menuOpen()) { if (!down) kb = {}; return; }
        var a = actionOf("Mouse" + e.button);
        if (!a) return;
        if (!down) { kb[a] = false; return; }
        if (!e.target || e.target.tagName !== "CANVAS") return;
        kb[a] = true; latch[a] = true; e.preventDefault();
      };
    }
    var md = onMouse(true), mu = onMouse(false);
    function noMenu(e) { if (e.target && e.target.tagName === "CANVAS" && actionOf("Mouse" + e.button)) e.preventDefault(); }
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("pointerdown", md);
    window.addEventListener("pointerup", mu);
    window.addEventListener("contextmenu", noMenu);
    window.addEventListener("blur", reset);
    return {
      pad: pad, kbReset: reset,
      setPad: function (a, v) { pad[a] = v; if (v) latch[a] = true; },
      get: function () {
        var on = function (a) { return !!(kb[a] || pad[a] || latch[a]); };
        var out = {
          left: on("left"), right: on("right"), up: !!(brawl && on("up")), down: on("down"),
          jump: on("jump") || (!brawl && on("up")), attack: on("attack"), throw: on("throw"), dog: on("dog")
        };
        latch = {};
        return out;
      },
      destroy: function () {
        window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); window.removeEventListener("blur", reset);
        window.removeEventListener("pointerdown", md); window.removeEventListener("pointerup", mu); window.removeEventListener("contextmenu", noMenu);
      }
    };
  }

  function createPad(host, input, brawl, shuriken) {
    var wrap = el("div", "octo-pad");
    function btn(label, action, cls, aria) {
      var b = el("button", "octo-pad__btn " + (cls || ""), label);
      b.type = "button"; b.setAttribute("aria-label", aria);
      function set(v) { return function (e) { e.preventDefault(); input.setPad(action, v); b.classList.toggle("is-down", v); }; }
      b.addEventListener("pointerdown", function (e) { b.setPointerCapture(e.pointerId); set(true)(e); });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (ev) { b.addEventListener(ev, set(false)); });
      b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      return b;
    }
    var left = el("div", "octo-pad__side octo-pad__side--left"), right = el("div", "octo-pad__side octo-pad__side--right");
    left.appendChild(btn("◀", "left", "", "Gauche"));
    left.appendChild(btn("▶", "right", "", "Droite"));
    if (brawl) { left.appendChild(btn("▲", "up", "octo-pad__btn--up", "Haut")); left.appendChild(btn("▼", "down", "octo-pad__btn--down", "Bas")); }
    right.appendChild(btn("⤒", "jump", "octo-pad__btn--round", "Sauter"));
    right.appendChild(btn("⚔", "attack", "octo-pad__btn--round octo-pad__btn--hot", "Attaquer"));
    if (shuriken) right.appendChild(btn("★", "throw", "octo-pad__btn--round", "Lancer un shuriken"));
    right.appendChild(btn("🐕", "dog", "octo-pad__btn--round", "Appeler Laita"));
    wrap.appendChild(left); wrap.appendChild(right);
    host.appendChild(wrap);
    var coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches), touched = false;
    function onTouch() { touched = true; refresh(); }
    function visible() { var S = settings(), m = S ? S.get("pad") : "auto"; return m === "on" || (m === "auto" && (coarse || touched)); }
    function refresh() { wrap.classList.toggle("is-on", visible()); }
    refresh();
    window.addEventListener("touchstart", onTouch, { once: true, passive: true });
    return { refresh: refresh, visible: visible, destroy: function () { window.removeEventListener("touchstart", onTouch); wrap.remove(); } };
  }

  /* ---------- scène ---------- */

  function createRun(k, h, def, hooks) {
    var run = def.run, brawl = run.mode === "brawl", theme = THEMES[run.theme] || THEMES.forest;
    var VW = k.width(), VH = k.height();
    var rgb = function (hex) { return k.Color.fromHex(hex); };
    var sim = brawl ? Sim.createBrawl(run, VW) : Sim.createPlatform(Sim.buildCourse(run.course), run.abilities || {});
    var ab = sim.abilities || {};
    var input = createInput(brawl);
    var host = document.querySelector(".octo-hero") || document.body;
    var hasPower = brawl && (run.crates || []).some(function (c) { return c.drop === "power"; });
    var pad = createPad(host, input, brawl, !!ab.shuriken || hasPower);
    var skipBtn = null, ended = false, destroyed = false, endT = 0, time = 0, mt = 0, hurtFlash = 0;

    /* ----- décor ----- */
    k.add([k.rect(VW + 200, VH + 200), k.pos(-100, -100), k.color(rgb(theme.sky)), k.fixed(), k.z(-5)]);
    function layer(sprite, factor, yFn, z, tint) {
      var items = [0, 1, 2].map(function () { return k.add([k.sprite(sprite), k.pos(0, 0), k.scale(2), k.color(rgb(tint)), k.z(z)]); });
      return function (cx, cy) {
        var shift = cx * factor, base = Math.floor(shift / 600);
        items.forEach(function (o, i) {
          o.pos.x = cx - VW / 2 + (base + i) * 600 - shift;
          o.pos.y = yFn(cy);
          o.flipX = ((base + i) % 2 + 2) % 2 === 1;
        });
      };
    }
    var skyLayer = layer("sky", 0.04, function (cy) { return cy - VH / 2; }, 0, theme.skyTint || "#ffffff");
    var landLayer = layer(brawl && window.OctoSprites.cities[run.theme] ? "cityfar" : "land", 0.35, function (cy) { return cy + VH / 2 - 210; }, 1, theme.land);
    var clouds = [[40, 26, "cloud0", 5], [260, 54, "cloud1", 7], [430, 18, "cloud0", 4], [140, 80, "cloud1", 6]].map(function (c) {
      return { o: k.add([k.sprite(c[2]), k.pos(c[0], c[1]), k.scale(2), k.opacity(0.9), k.color(rgb(theme.skyTint || "#ffffff")), k.fixed(), k.z(0.5)]), x: c[0], sp: c[3] };
    });

    var objs = new Map(), shurikenObjs = new Map(), bitObjs = [], candleObjs = [], cpObjs = [];
    var heartObjs = [], player, shadow, terminalObj, light = null;
    var cave = null, curtain = null, sparkT = 0;
    if (!brawl && sim.secret) { // salle secrète : fond de grotte + rideau qui cache le niveau (seulement quand on y est), tuyau de sortie
      var scr = sim.secret, ex = scr.exit;
      cave = k.add([k.rect(VW + 200, VH + 200), k.pos(-100, -100), k.color(rgb("#150f2a")), k.opacity(0), k.fixed(), k.z(4.6)]);
      curtain = k.add([k.rect(scr.curtainR + 400, sim.h + 600), k.pos(-400, -300), k.color(rgb("#150f2a")), k.opacity(0), k.z(20)]);
      k.add([k.rect(26, 34), k.pos(ex.x - 13, ex.y - 34), k.color(rgb("#2ea043")), k.z(5.8)]);
      k.add([k.rect(36, 10), k.pos(ex.x - 18, ex.y - 44), k.color(rgb("#3fb950")), k.z(5.9)]);
      k.add([k.rect(6, 26), k.pos(ex.x - 9, ex.y - 32), k.color(rgb("#7ee787")), k.opacity(0.5), k.z(5.95)]);
      k.add([k.text("SORTIE", { size: 8, font: "monospace" }), k.pos(ex.x - 17, ex.y - 60), k.color(rgb("#7ee787")), k.z(6)]);
    }
    /** Bougies, pièces et drapeaux du trajet (posés au départ, reposés quand tout le niveau recommence). */
    function buildPlatformDynamics() {
      sim.candles.forEach(function (c) {
        var o2 = k.add([k.sprite("candle"), k.pos(c.x, c.y), k.anchor("bot"), k.scale(2), k.z(6.5)]);
        candleObjs.push({ c: c, o: o2 });
      });
      sim.bits.forEach(function (b) { if (!b.got) bitObjs.push({ b: b, o: k.add([k.sprite("bit"), k.pos(b.x, b.y), k.anchor("center"), k.scale(1.6), k.z(6)]) }); });
      sim.checkpoints.forEach(function (c) {
        var pole = k.add([k.rect(3, 40), k.pos(c.x - 1, c.y - 40), k.color(rgb("#8b949e")), k.z(5.8)]);
        var flag = k.add([k.rect(18, 11), k.pos(c.x + 2, c.y - 40), k.color(rgb("#f85149")), k.z(5.9)]);
        cpObjs.push({ c: c, pole: pole, flag: flag });
      });
    }
    /** Plus de cœur : tout le niveau recommence, on efface les anciens objets du décor et on repose les nouveaux. */
    function resetWorldObjs() {
      var gone = function (q) { if (q && q.exists && q.exists()) q.destroy(); };
      bitObjs.forEach(function (b) { gone(b.o); }); bitObjs.length = 0;
      candleObjs.forEach(function (c) { gone(c.o); }); candleObjs.length = 0;
      cpObjs.forEach(function (c) { gone(c.pole); gone(c.flag); }); cpObjs.length = 0;
      k.destroyAll("octo-item");
      crateObjs.forEach(function (o) { gone(o); }); crateObjs.clear();
      if (!brawl) buildPlatformDynamics();
    }
    var worldW = sim.w, worldH = sim.h;

    if (brawl) {
      var FLOOR_Y = 236;
      buildCity(FLOOR_Y);
      terminalObj = k.add([k.sprite("terminal"), k.pos(sim.terminal.x, sim.terminal.y), k.anchor("bot"), k.scale(2), k.z(6 + sim.terminal.y / 400)]);
    } else {
      var solid = sim.solid, rowsN = solid.length, colsN = solid[0].length, tx, ty;
      for (ty = 0; ty < rowsN; ty++) {
        for (tx = 0; tx < colsN; tx++) {
          if (!solid[ty][tx]) continue;
          var open = ty === 0 || !solid[ty - 1][tx];
          var o = k.add([k.sprite((open ? "grass" : "dirt") + ((tx + ty) % 3)), k.pos(tx * T, ty * T), k.scale(2), k.color(rgb(theme.tile)), k.z(5)]);
          if (typeof k.offscreen === "function") o.use(k.offscreen({ hide: true, distance: 40 }));
        }
      }
      props(function (i) { // un élément de décor tous les ~5 colonnes, sur la première tuile de sol
        var cx = 3 + i * 5 + ((i * 7) % 3);
        if (cx >= colsN) return null;
        for (var r = 0; r < rowsN; r++) if (solid[r][cx] && (r === 0 || !solid[r - 1][cx])) return { x: cx * T + T / 2, y: r * T + 2, z: 3.5 };
        return null;
      }, Math.floor(colsN / 5), 2.3);
      sim.spikes.forEach(function (s) { k.add([k.sprite("spike"), k.pos(s.l - 5, s.b - T), k.scale(2), k.z(5.5)]); });
      buildPlatformDynamics();
      var tm = sim.terminal;
      if (sim.cave) { // fin en grotte : fond sombre, torches, lueurs ; l'entrée s'ouvre sur la paroi du dernier trou (un panneau le dit)
        var cv = sim.cave;
        k.add([k.rect(cv.r - cv.l, cv.b - cv.t), k.pos(cv.l, cv.t), k.color(rgb("#120d24")), k.z(4.8)]);
        [cv.l + 30, cv.l + (cv.r - cv.l) * 0.5].forEach(function (tx2) {
          k.add([k.sprite("torch"), k.pos(tx2, cv.b), k.anchor("bot"), k.scale(2.4), k.z(5.6)]);
          k.add([k.sprite("glow"), k.pos(tx2, cv.b - 34), k.anchor("center"), k.scale(4), k.color(rgb("#ffb347")), k.opacity(0.32), k.z(5.7)]);
        });
        k.add([k.sprite("glow"), k.pos(tm.x, tm.y - 20), k.anchor("center"), k.scale(3.6), k.color(rgb("#39c5cf")), k.opacity(0.3), k.z(5.7)]);
        var pc = Math.floor(cv.l / T) - 1, pr = -1, rr;
        while (pc > 0) { for (rr = 0; rr < rowsN; rr++) if (solid[rr][pc]) { pr = rr; break; } if (pr >= 0) break; pc--; }
        if (pr >= 0) { // pc = dernière colonne de sol avant le trou
          k.add([k.sprite("sign"), k.pos((pc - 1) * T, pr * T + 2), k.anchor("bot"), k.scale(2.4), k.z(5.9)]);
          k.add([k.text("GROTTE >", { size: 8, font: "monospace" }), k.pos((pc - 1) * T - 26, pr * T - 58), k.color(rgb("#7ee787")), k.z(6)]);
        }
      }
      terminalObj = k.add([k.sprite("terminal"), k.pos(tm.x, tm.y), k.anchor("bot"), k.scale(2), k.z(6)]);
      if (theme.light) light = k.add([k.sprite("glow"), k.pos(0, 0), k.anchor("center"), k.scale(7), k.color(rgb(theme.light)), k.opacity(0.22), k.z(28.4)]);
    }

    shadow = k.add([k.sprite("glow"), k.pos(0, 0), k.anchor("center"), k.scale(0.7, 0.18), k.color(rgb("#1a1040")), k.opacity(0.55), k.z(5.9)]);
    // Laita, la chienne de l'OctoCat : elle suit, et à l'appel (clic droit) elle fait fuir le monstre le plus proche
    var dogShadow = k.add([k.sprite("glow"), k.pos(0, 0), k.anchor("center"), k.scale(0.5, 0.14), k.color(rgb("#1a1040")), k.opacity(0.5), k.z(5.9)]);
    var laita = k.add([k.sprite("laita", { anim: "idle" }), k.pos(sim.dog.x, sim.dog.y), k.anchor("bot"), k.scale(1.8), k.opacity(1), k.z(8.9)]);
    player = k.add([k.sprite("octo", { anim: "idle" }), k.pos(sim.player.x, sim.player.y), k.anchor("bot"), k.scale(2), k.color(), k.opacity(1), k.z(9)]);
    var rainbow = k.add([k.sprite("octo", { anim: "idle" }), k.pos(0, 0), k.anchor("bot"), k.scale(2), k.color(rgb("#ffffff")), k.opacity(0), k.z(9.05)]);
    var aura = k.add([k.sprite("glow"), k.pos(0, 0), k.anchor("center"), k.scale(1.7), k.color(rgb("#ffffff")), k.opacity(0), k.z(8.9)]);
    var stateY = 48, starWas = false, trailT = 0;
    var starTxt = k.add([k.text("INVINCIBLE", { size: 9, font: "monospace" }), k.pos(10, stateY), k.color(rgb("#ffffff")), k.opacity(0), k.fixed(), k.z(31)]);
    var starBar = k.add([k.rect(60, 4), k.pos(10, stateY + 11), k.color(rgb("#ffffff")), k.opacity(0), k.fixed(), k.z(31)]);
    var powTxt = k.add([k.text("SUPER SHURIKEN", { size: 9, font: "monospace" }), k.pos(10, stateY + 18), k.color(rgb("#ffd54a")), k.opacity(0), k.fixed(), k.z(31)]);
    var powBar = k.add([k.rect(60, 4), k.pos(10, stateY + 29), k.color(rgb("#ffd54a")), k.opacity(0), k.fixed(), k.z(31)]);
    // jauge de Laita (en bas à gauche) : se remplit, puis « PRETE »
    var dogTxt = k.add([k.text("LAITA", { size: 9, font: "monospace" }), k.pos(10, VH - 38), k.color(rgb("#ffffff")), k.opacity(0.9), k.fixed(), k.z(31)]);
    k.add([k.rect(60, 4), k.pos(10, VH - 27), k.color(rgb("#0d1117")), k.opacity(0.6), k.fixed(), k.z(31)]);
    var dogBar = k.add([k.rect(60, 4), k.pos(10, VH - 27), k.color(rgb("#7ee787")), k.fixed(), k.z(31.1)]);

    if (theme.wash) k.add([k.rect(VW + 100, VH + 100), k.pos(-50, -50), k.color(rgb(theme.wash[0])), k.opacity(theme.wash[1]), k.fixed(), k.z(28.2)]);
    k.add([k.sprite("vignette"), k.pos(0, 0), k.scale(VW / 600, VH / 250), k.fixed(), k.z(30)]);
    k.add([k.rect(VW, 46), k.pos(0, 0), k.color(rgb("#0d1117")), k.opacity(0.4), k.fixed(), k.z(30.5)]);
    var flash = k.add([k.rect(VW + 100, VH + 100), k.pos(-50, -50), k.color(rgb("#f85149")), k.opacity(0), k.fixed(), k.z(30.4)]);

    /* ----- interface fixe ----- */
    var hpMax = brawl ? sim.player.hpMax : Sim.CFG.hpMax;
    for (var hi = 0; hi < hpMax; hi++) heartObjs.push(k.add([k.sprite("heart"), k.pos(10 + hi * 20, 8), k.scale(1.7), k.fixed(), k.z(31)]));
    var bitsTxt = k.add([k.text("PIECES 0/" + sim.stats.bitsTotal, { size: 11, font: "monospace" }), k.pos(10, 30), k.color(rgb("#e3b341")), k.fixed(), k.z(31)]);
    var progress = k.add([k.rect(1, 3), k.pos(0, 0), k.color(rgb("#3fb950")), k.fixed(), k.z(31.5)]);
    var plate = k.add([k.rect(Math.min(VW - 20, 300), 62), k.pos(VW / 2, VH * 0.3 + 8), k.anchor("center"), k.color(rgb("#0d1117")), k.opacity(0.5), k.fixed(), k.z(31.8)]);
    var banner = k.add([k.text("NIVEAU " + def.id, { size: 22, font: "monospace" }), k.pos(VW / 2, VH * 0.3), k.anchor("center"), k.color(rgb("#ffffff")), k.opacity(1), k.fixed(), k.z(32)]);
    var sub = k.add([k.text(plain(def.title), { size: 11, font: "monospace" }), k.pos(VW / 2, VH * 0.3 + 22), k.anchor("center"), k.color(rgb("#ffe08a")), k.opacity(1), k.fixed(), k.z(32)]);
    // Rappel des commandes : suit les touches choisies dans le menu ⚙ (texte sans accents : police par défaut de KAPLAY)
    function hintText() {
      var S = settings();
      if (!S) return "";
      var f = function (a, n) { return S.hintFor(a, n); };
      if (brawl) return f("left", 1) + "/" + f("right", 1) + "/" + f("up", 1) + "/" + f("down", 1) + ": BOUGER   " + f("jump", 1) + ": SAUTER   " + f("attack", 2) + ": FRAPPER   " + f("dog", 2) + ": LAITA" + (hasPower ? "   " + f("throw", 2) + ": SHURIKEN (ETOILE)" : "");
      return f("left", 1) + "/" + f("right", 1) + ": BOUGER   " + f("jump", 1) + "/" + f("up", 1) + ": SAUTER   " + f("attack", 2) + ": ATTAQUER   " + f("dog", 2) + ": LAITA" +
        (ab.shuriken ? "   " + f("throw", 2) + ": SHURIKEN" : "") + (ab.doubleJump ? "   (DOUBLE SAUT)" : "");
    }
    var hint = k.add([k.text(" ", { size: 9, font: "monospace" }), k.pos(VW / 2, VH - 12), k.anchor("center"), k.color(rgb("#e6edf3")), k.opacity(0.9), k.fixed(), k.z(31)]);
    var hintVer = -1;
    function refreshHint() { // la plus grande taille entière qui tient dans la largeur de l'écran
      var txt = hintText(), sz = 9;
      try { while (sz > 6 && k.formatText({ text: txt, size: sz, font: "monospace" }).width > VW - 12) sz--; } catch { /* mesure indisponible : taille par défaut */ }
      hint.text = txt; hint.textSize = sz;
    }
    var goTxt = k.add([k.text("GO >", { size: 22, font: "monospace" }), k.pos(VW - 40, VH * 0.4), k.anchor("center"), k.color(rgb("#ffe08a")), k.opacity(0), k.fixed(), k.z(32)]);
    var toast = k.add([k.text("", { size: 14, font: "monospace" }), k.pos(VW / 2, VH * 0.46), k.anchor("center"), k.color(rgb("#ffffff")), k.opacity(0), k.fixed(), k.z(32)]);
    var toastT = 0;
    /** Petit texte qui monte et s'efface (« OUAF ! », « ! » au-dessus d'un monstre effrayé). */
    function pop(x, y, str, color, size) {
      var t = k.add([k.text(str, { size: size || 10, font: "monospace" }), k.pos(x, y), k.anchor("center"), k.color(rgb(color || "#ffffff")), k.opacity(1), k.z(16)]), age = 0;
      t.onUpdate(function () { age += k.dt(); t.pos.y -= 28 * k.dt(); t.opacity = Math.max(0, 1 - age / 0.9); if (age >= 0.9) t.destroy(); });
    }
    function say(str, color) { toast.text = str; toast.color = rgb(color || "#ffffff"); toastT = 1.1; }

    function burst(x, y, colors, n, power) {
      for (var j = 0; j < n; j++) {
        (function (jj) {
          var pw = power || 1, vx = k.rand(-110, 110) * pw, vy = k.rand(-190, -30) * pw, life = k.rand(0.35, 0.7), age = 0;
          var pcl = k.add([k.rect(3, 3), k.pos(x, y), k.color(rgb(colors[jj % colors.length])), k.opacity(1), k.z(15)]);
          pcl.onUpdate(function () {
            age += k.dt(); vy += 520 * k.dt(); pcl.pos.x += vx * k.dt(); pcl.pos.y += vy * k.dt();
            pcl.opacity = Math.max(0, 1 - age / life);
            if (age >= life) pcl.destroy();
          });
        })(j);
      }
    }

    /** Rue de ville façon Double Dragon : façades (un sprite chacune), enseignes, trottoir, chaussée, lampadaires, voitures. */
    function buildCity(FY) {
      var Sp = window.OctoSprites, C = Sp.cities[run.theme] || Sp.cities.village, M = Sp.cityMeta, rnd = Sp.seeded(4001 + def.id * 17);
      var span = worldW + VW * 2;
      // trottoir (FY..FY+28), bordure, chaussée avec ligne axiale et joints du trottoir
      k.add([k.rect(span, 28), k.pos(-VW, FY), k.color(rgb(C.walk)), k.z(4)]);
      for (var jx = -VW; jx < worldW + VW; jx += 44) k.add([k.rect(1, 28), k.pos(jx, FY), k.color(rgb("#000000")), k.opacity(0.12), k.z(4.02)]);
      k.add([k.rect(span, 3), k.pos(-VW, FY + 28), k.color(rgb("#d6d0e8")), k.z(4.05)]);
      k.add([k.rect(span, 200), k.pos(-VW, FY + 31), k.color(rgb(C.road)), k.z(4)]);
      for (var lx = -VW; lx < worldW + VW; lx += 64) k.add([k.rect(34, 2), k.pos(lx, 300), k.color(rgb("#e8d27a")), k.opacity(0.7), k.z(4.05)]);
      // façades
      var x = -110, bi = 0, lampX = [];
      while (x < worldW + VW) {
        var v = (bi + def.id) % 6, bw = M.widths[v] * 2, flip = bi % 3 === 2;
        k.add([k.sprite("bld-" + run.theme + "-" + v), k.pos(x, FY), k.anchor("botleft"), k.scale(2), k.z(3.2)]);
        if (bi % 2 === 0) { // enseigne néon au-dessus du rez-de-chaussée
          var label = C.label[(bi / 2) % 3 | 0], sx = x + bw / 2, sy = FY - 74;
          k.add([k.rect(label.length * 7 + 8, 12), k.pos(sx, sy), k.anchor("center"), k.color(rgb(C.dark)), k.opacity(0.85), k.z(3.5)]);
          k.add([k.sprite("glow"), k.pos(sx, sy), k.anchor("center"), k.scale(label.length * 0.5, 0.5), k.color(rgb(C.win)), k.opacity(0.3), k.z(3.45)]);
          k.add([k.text(label, { size: 8, font: "monospace" }), k.pos(sx, sy), k.anchor("center"), k.color(rgb(C.win)), k.z(3.6)]);
        }
        if (flip) lampX.push(x + bw + 3);
        x += bw + 6 + Math.floor(rnd() * 8); bi++;
      }
      // mobilier urbain sur le trottoir : lampadaires (halo doux), poubelles, bouches d'incendie ; voitures le long de la bordure
      for (var px = 110; px < worldW + 60; px += 215 + Math.floor(rnd() * 40)) {
        k.add([k.sprite("lamp"), k.pos(px, FY + 20), k.anchor("bot"), k.scale(2), k.z(3.9)]);
        k.add([k.sprite("glow"), k.pos(px + 6, FY - 36), k.anchor("center"), k.scale(2.6), k.color(rgb("#ffd27a")), k.opacity(0.22), k.z(3.85)]);
      }
      for (var bx = 60; bx < worldW; bx += 170 + Math.floor(rnd() * 90)) {
        var pick = rnd() < 0.5;
        k.add([k.sprite(pick ? "bin" : "hydrant"), k.pos(bx, FY + 22), k.anchor("bot"), k.scale(2), k.z(3.95)]);
      }
      var carCols = ["#ff8a8a", "#8ac8ff", "#ffe08a", "#b8f0b8", "#d8b8ff"];
      for (var cx2 = 260, ci = 0; cx2 < worldW; cx2 += 520 + Math.floor(rnd() * 160), ci++) {
        k.add([k.sprite("car"), k.pos(cx2, FY + 40), k.anchor("bot"), k.scale(2), k.color(rgb(carCols[ci % carCols.length])), k.z(3.97)]);
      }
    }

    /** Flamme nette (deux rectangles qui vacillent) + léger halo, posée sur la vasque d'une torche. */
    function flame(x, y, z) {
      var gl = k.add([k.sprite("glow"), k.pos(x, y - 6), k.anchor("center"), k.scale(1.8), k.color(rgb("#f0883e")), k.opacity(0.28), k.z(z - 0.01)]);
      var outer = k.add([k.rect(13, 20), k.pos(x, y + 3), k.anchor("bot"), k.color(rgb("#f0883e")), k.z(z)]);
      var inner = k.add([k.rect(7, 13), k.pos(x, y + 3), k.anchor("bot"), k.color(rgb("#ffe08a")), k.z(z + 0.01)]);
      outer.onUpdate(function () {
        var f = 0.8 + 0.2 * Math.sin(time * 11 + x), g = 0.8 + 0.2 * Math.sin(time * 14 + x * 2);
        outer.height = Math.round(20 * f); inner.height = Math.round(13 * g);
        gl.opacity = 0.22 + 0.1 * f;
      });
    }

    /** Pose des éléments de décor (arbres, torches, panneaux…) selon le thème, derrière l'action. */
    function props(place, count, baseScale) {
      var list = theme.deco || [];
      for (var i = 0; i < count && list.length; i++) {
        var pos = place(i);
        if (!pos) continue;
        var name = list[i % list.length], sc = name === "torch" ? 2.4 : name === "tree" || name === "palm" ? baseScale : name === "sign" ? 2.4 : 2.6;
        k.add([k.sprite(name), k.pos(pos.x, pos.y), k.anchor("bot"), k.scale(sc), k.color(rgb(theme.tile)), k.z(pos.z)]);
        if (name === "torch") flame(pos.x, pos.y - 46, pos.z + 0.02);
      }
    }

    function slash(p) {
      // croissant dessiné vers la droite ; vers la gauche on inverse l'échelle (le flipX d'un sprite ancré à gauche ne le déplaçait pas)
      var face = p.facing, sx = ab.whip ? 2.1 : 1.6;
      var s = k.add([k.sprite("slash"), k.pos(0, 0), k.anchor("left"), k.scale(face < 0 ? -sx : sx, 1.6), k.opacity(0.95), k.z(10), "slash"]);
      var age = 0;
      s.onUpdate(function () {
        age += k.dt();
        s.pos.x = sim.player.x + face * 4; s.pos.y = (brawl ? sim.player.y - sim.player.jz : sim.player.y) - 20;
        s.opacity = Math.max(0, 0.95 - age / 0.16);
        if (age > 0.16) s.destroy();
      });
    }

    var SFX = { jump: "jump", djump: "djump", land: "land", swing: "swing", hit: "hit", kill: "kill", stomp: "stomp", hurt: "hurt", bit: "bit", heart: "heart", throw: "throw", checkpoint: "checkpoint", finish: "finish", candle: "hit", die: "hurt", fall: "hurt", wave: "hurt", star: "star", power: "power", crate: "crate", "crate-hit": "crate-hit", shot: "shot", dash: "dash", bark: "bark", scare: "scare", secret: "power", "secret-out": "checkpoint" };

    function handle(ev) {
      var m = music();
      if (SFX[ev.t]) m.sfx(SFX[ev.t]);
      var py = brawl ? ev.y - 12 : ev.y;
      switch (ev.t) {
        case "jump": case "djump": burst(ev.x, ev.y, ["#d8c0ff", "#ffffff"], 5, 0.5); break;
        case "land": burst(ev.x, ev.y, ["#a8747c", "#d8c0ff"], 4, 0.5); break;
        case "swing": slash(sim.player); break;
        case "hit": burst(ev.x, ev.y, ["#ffffff", "#e3b341"], 8, 0.8); k.shake(2); break;
        case "kill": burst(ev.x, ev.y, ["#f85149", "#e3b341", "#ffffff", "#39c5cf"], 22); k.shake(4); break;
        case "stomp": burst(ev.x, ev.y, ["#ffffff", "#39c5cf"], 10); k.shake(3); break;
        case "candle": burst(ev.x, ev.y, ["#f0883e", "#ffe08a"], 10); break;
        case "hurt": hurtFlash = 0.35; k.shake(8); burst(ev.x, py - 10, ["#f85149", "#ffffff"], 10); break;
        case "die": case "fall": hurtFlash = 0.6; k.shake(10); say(ev.t === "fall" ? "CHUTE !" : "K.O. !", "#f85149"); break;
        case "bit": burst(ev.x, ev.y, ["#e3b341", "#fff4c2"], 6, 0.6); break;
        case "heart": burst(ev.x, ev.y, ["#f85149", "#ffd6d6"], 8, 0.7); say("+ VIE", "#ff9aa0"); break;
        case "checkpoint": say("POINT DE CONTROLE", "#7ee787"); break;
        case "restart": resetWorldObjs(); snapCam(); say("TOUT RECOMMENCE", "#f85149"); break;
        case "secret": snapCam(); say("SALLE SECRETE !", "#ffd54a"); burst(ev.x, ev.y - 40, ["#ffd54a", "#fff4c2", "#ffffff"], 20, 0.9); break;
        case "secret-out": snapCam(); say("DE RETOUR !", "#7ee787"); break;
        case "wave": say("ATTENTION !", "#f85149"); k.shake(5); break;
        case "star": say("INVINCIBLE !", "#ffffff"); burst(ev.x, ev.y, ["#ff6a6a", "#ffd54a", "#7ee787", "#58a6ff", "#bc8cff"], 26, 1.1); k.shake(3); break;
        case "power": say("SUPER SHURIKEN !", "#ffd54a"); burst(ev.x, ev.y, ["#ffd54a", "#fff4c2", "#ffffff"], 18, 0.9); break;
        case "crate": burst(ev.x, ev.y - 10, ["#a1713b", "#d4a05a", "#5a3a1a", "#c9d1d9"], 18, 0.9); k.shake(3); break;
        case "crate-hit": burst(ev.x, ev.y - 12, ["#d4a05a", "#a1713b"], 5, 0.6); break;
        case "dash": burst(ev.x, ev.y + 10, ["#ffffff", "#a98bff"], 5, 0.5); break;
        case "bark": pop(ev.x + sim.dog.face * 10, ev.y - 14, "OUAF !", "#ffffff", 9); break;
        case "scare": burst(ev.x, ev.y, ["#ffe08a", "#ffffff", "#7ee0ff"], 9, 0.7); pop(ev.x, ev.y - 22, "!", "#ffd54a", 14); break;
        case "clear": say("VAGUE VAINCUE", "#7ee787"); break;
        default: break;
      }
    }

    /* ----- caméra ----- */
    var cam = { x: sim.player.x, y: brawl ? worldH - VH / 2 : sim.player.y - 70 };
    function camTarget() {
      var p = sim.player, tx, ty;
      if (brawl) {
        tx = sim.lock ? sim.lock.l + VW / 2 : p.x + 30;
        ty = worldH - VH / 2;
      } else {
        tx = p.x + p.facing * 40; ty = p.y - 80;
      }
      var ww = sim.secret && !sim.secret.inRoom ? sim.secret.levelW : worldW; // la salle secrète est à droite du monde : la caméra ne la montre que quand on y est
      tx = ww <= VW ? ww / 2 : clamp(tx, VW / 2, ww - VW / 2);
      ty = VH >= worldH ? worldH - VH / 2 : clamp(ty, VH / 2, worldH - VH / 2);
      return { x: tx, y: ty };
    }
    function snapCam() { var q = camTarget(); cam.x = q.x; cam.y = q.y; }
    var c0 = camTarget(); cam.x = c0.x; cam.y = c0.y;
    k.camPos(cam.x, cam.y);

    /* ----- boucle ----- */
    var ENEMY_TINT = { grunt: "#ffffff", fast: "#7ee0ff", heavy: "#ffb347", ninja: "#a98bff", slinger: "#8aee9a", walker: "#ffffff", tough: "#ffb347", hopper: "#8aee9a", dasher: "#ff7a9a" };

    function syncEnemies() {
      var seen = new Set();
      sim.enemies.forEach(function (e) {
        if (e.alive === false) return;
        seen.add(e);
        var o = objs.get(e);
        if (!o) {
          if (e.type === "flyer") o = k.add([k.sprite("bat", { anim: "fly" }), k.pos(e.x, e.y), k.anchor("center"), k.scale(2), k.z(8)]);
          else {
            var sc = brawl ? (e.kind === "heavy" ? 2.8 : e.kind === "fast" ? 1.8 : e.kind === "ninja" ? 1.95 : 2.1) : (e.type === "tough" ? 1.9 : e.type === "dasher" ? 1.75 : e.type === "hopper" ? 1.4 : 1.5);
            o = k.add([k.sprite("glitch", { anim: "idle" }), k.pos(e.x, e.y), k.anchor("bot"), k.scale(sc), k.color(rgb(ENEMY_TINT[e.kind || e.type] || "#ffffff")), k.opacity(1), k.z(8)]);
            o.baseScale = sc;
          }
          objs.set(e, o);
        }
        o.pos.x = e.x; o.pos.y = e.y;
        if (e.scared > 0) {
          if (!o.__mark) o.__mark = k.add([k.text("!", { size: 14, font: "monospace" }), k.pos(e.x, e.y), k.anchor("center"), k.color(rgb("#ffd54a")), k.z(16)]);
          o.__mark.pos.x = e.x; o.__mark.pos.y = e.y - (e.type === "flyer" ? 16 : (brawl ? 62 : 48)) + Math.sin(time * 14) * 2;
          o.opacity = 0.62 + 0.2 * Math.sin(time * 16);
        } else if (o.__mark) { o.__mark.destroy(); o.__mark = null; o.opacity = 1; }
        if (e.type !== "flyer") {
          var face = brawl ? e.facing : e.dir;
          o.flipX = face > 0;
          if (brawl) {
            o.z = 6 + e.y / 400;
            var want = e.hurt > 0 ? "hurt" : e.wind > 0 ? "attack" : "idle";
            if (o.__anim !== want) { o.__anim = want; o.play(want); }
          } else {
            var wa = e.hurt > 0 ? "hurt" : "idle";
            if (o.__anim !== wa) { o.__anim = wa; o.play(wa); }
            // le fonceur clignote avant de charger
            if (e.type === "dasher") o.color = e.mode === "wind" && Math.floor(time * 18) % 2 ? rgb("#ffffff") : rgb(ENEMY_TINT.dasher);
          }
        }
      });
      objs.forEach(function (o, e) { if (!seen.has(e)) { if (o.__mark) o.__mark.destroy(); o.destroy(); objs.delete(e); } });
    }

    function syncPlatformWorld(t) {
      bitObjs.forEach(function (b, i) {
        if (b.b.got) { if (b.o.exists()) b.o.destroy(); return; }
        b.o.pos.y = b.b.y + Math.sin(t * 4 + i) * 2;
      });
      candleObjs.forEach(function (c) { if (!c.c.alive && c.o.exists()) c.o.destroy(); });
      cpObjs.forEach(function (c) { if (c.c.on) c.flag.color = rgb("#3fb950"); });
      // objets ramassables apparus en cours de partie (cœurs, bits des bougies)
      sim.items.forEach(function (it) {
        if (!it.o) {
          it.o = k.add([k.sprite(it.kind === "power" ? "power" : "heart"), k.pos(it.x, it.y), k.anchor("center"), k.scale(it.kind === "power" ? 1.5 : 1.6), k.z(6), "octo-item"]);
          if (it.kind === "power") it.g = k.add([k.sprite("glow"), k.pos(it.x, it.y), k.anchor("center"), k.scale(1.3), k.color(rgb("#ffd54a")), k.opacity(0.35), k.z(5.9), "octo-item"]);
        }
        if (!it.got) { it.o.pos.y = it.y + Math.sin(t * 5 + it.x) * 2; if (it.g) { it.g.pos.y = it.o.pos.y; it.g.opacity = 0.28 + 0.1 * Math.sin(t * 8); } }
        if (it.got) { if (it.o.exists()) it.o.destroy(); if (it.g && it.g.exists()) it.g.destroy(); }
      });
      sim.bits.forEach(function (b) {
        if (!b.o && !b.got && !bitObjs.some(function (q) { return q.b === b; })) {
          bitObjs.push({ b: b, o: k.add([k.sprite("bit"), k.pos(b.x, b.y), k.anchor("center"), k.scale(1.6), k.z(6)]) });
          b.o = true;
        }
      });
      // shurikens
      var live = new Set();
      sim.shurikens.forEach(function (s) {
        live.add(s);
        var o = shurikenObjs.get(s);
        if (!o) { o = k.add([k.sprite("shuriken"), k.pos(s.x, s.y), k.anchor("center"), k.scale(s.power ? 2.3 : 1.6), k.color(rgb(s.power ? "#ffd54a" : "#ffffff")), k.rotate(0), k.z(9.5)]); shurikenObjs.set(s, o); }
        o.pos.x = s.x; o.pos.y = s.y; o.angle += 900 * k.dt();
      });
      shurikenObjs.forEach(function (o, s) { if (!live.has(s)) { o.destroy(); shurikenObjs.delete(s); } });
    }

    var crateObjs = new Map(), starObjs = new Map(), shotObjs = new Map();
    function syncBrawlWorld() {
      sim.items.forEach(function (it) {
        if (!it.o) {
          it.o = k.add([k.sprite(it.kind === "power" ? "power" : "heart"), k.pos(it.x, it.y - 6), k.anchor("center"), k.scale(it.kind === "power" ? 1.7 : 1.8), k.z(6 + it.y / 400), "octo-item"]);
          if (it.kind === "power") it.g = k.add([k.sprite("glow"), k.pos(it.x, it.y - 8), k.anchor("center"), k.scale(1.5), k.color(rgb("#ffd54a")), k.opacity(0.35), k.z(5.9 + it.y / 400), "octo-item"]);
        }
        if (!it.got) { it.o.pos.y = it.y - 12 + Math.sin(time * 5 + it.x) * 2; if (it.g) { it.g.pos.y = it.o.pos.y; it.g.opacity = 0.28 + 0.1 * Math.sin(time * 8); } }
        if (it.got) { if (it.o.exists()) it.o.destroy(); if (it.g && it.g.exists()) it.g.destroy(); }
      });
      // caisses (cassables) et bennes (fixes) : obstacles du couloir
      sim.crates.forEach(function (c) {
        var o = crateObjs.get(c);
        if (!c.alive) { if (o) { o.destroy(); crateObjs.delete(c); } return; }
        if (!o) { o = k.add([k.sprite(c.kind === "block" ? "block" : "crate"), k.pos(c.x, c.y + c.d / 2), k.anchor("bot"), k.scale(2), k.z(6 + c.y / 400)]); o.__s = c.kind === "block" ? "block" : "crate"; crateObjs.set(c, o); }
        var want = c.kind === "block" ? "block" : c.hp < 2 ? "crate2" : "crate";
        if (o.__s !== want) { o.__s = want; o.use(k.sprite(want)); }
        o.pos.x = c.x + (c.hit > 0 ? (Math.floor(time * 60) % 2 ? 2 : -2) : 0);
      });
      // étoiles-shurikens du joueur et bouteilles des lanceurs
      var live = new Set();
      sim.stars.forEach(function (st) {
        live.add(st);
        var o = starObjs.get(st);
        if (!o) { o = k.add([k.sprite("shuriken"), k.pos(st.x, st.y - 18), k.anchor("center"), k.scale(2.2), k.color(rgb("#ffd54a")), k.rotate(0), k.z(9.6)]); starObjs.set(st, o); }
        o.pos.x = st.x; o.pos.y = st.y - 18; o.angle += 900 * k.dt();
      });
      starObjs.forEach(function (o, st) { if (!live.has(st)) { o.destroy(); starObjs.delete(st); } });
      var liveShots = new Set();
      sim.shots.forEach(function (sh) {
        liveShots.add(sh);
        var o = shotObjs.get(sh);
        if (!o) { o = k.add([k.sprite("bottle"), k.pos(sh.x, sh.y - 16), k.anchor("center"), k.scale(2), k.rotate(0), k.z(9.4)]); shotObjs.set(sh, o); }
        o.pos.x = sh.x; o.pos.y = sh.y - 16; o.angle += 520 * k.dt() * (sh.vx > 0 ? 1 : -1);
      });
      shotObjs.forEach(function (o, sh) { if (!liveShots.has(sh)) { o.destroy(); shotObjs.delete(sh); } });
    }

    // Les pièces ramassées passent dans la poche du joueur (elles paient les indices) ; seules les nouvelles comptent.
    var banked = false;
    function bankCoins() {
      if (banked || !window.OctoProgress) return 0;
      banked = true;
      return window.OctoProgress.bank(def.id, sim.stats.bits);
    }

    function finishRun() {
      if (ended) return;
      ended = true; endT = 0;
      var gain = bankCoins();
      say(gain ? "TERMINAL ATTEINT  +" + gain + " PIECES" : "TERMINAL ATTEINT", "#7ee787");
      music().sfx("finish");
      burst(sim.terminal.x, sim.terminal.y - 30, ["#3fb950", "#39c5cf", "#ffffff", "#bc8cff"], 26);
    }

    k.onUpdate(function () {
      if (destroyed) return;
      var dt = Math.min(k.dt(), 1 / 20), p = sim.player;
      time += dt;

      var S = settings();
      if (S && S.version() !== hintVer) { hintVer = S.version(); refreshHint(); pad.refresh(); }
      sim.relax = !!(S && S.get("relax"));

      if (!ended) {
        if (!menuOpen()) sim.step(input.get(), dt); // le menu ⚙ met la partie en pause
        sim.events.forEach(handle);
        sim.events.length = 0;
        if (sim.finished) finishRun();
      } else {
        endT += dt;
        if (endT > 1) { destroyed = true; bankCoins(); hooks.finish(); return; }
      }

      // joueur
      var py = brawl ? p.y - p.jz : p.y;
      player.pos.x = p.x; player.pos.y = py;
      player.flipX = p.facing < 0;
      if (brawl) player.z = 6.05 + p.y / 400;
      var anim = "idle";
      if (p.inv > (brawl ? 0.7 : 1.0)) anim = "hurt";
      else if ((brawl ? p.atk : p.swing) > 0) anim = "atk";
      else if (brawl ? p.air : !p.onGround) anim = "jump";
      else if (Math.abs(brawl ? 0 : p.vx) > 20 || (brawl && (input.get().left || input.get().right || input.get().up || input.get().down))) anim = "run";
      if (player.__anim !== anim) { player.__anim = anim; player.play(anim); }
      player.opacity = p.inv > 0 && Math.floor(time * 18) % 2 === 0 ? 0.35 : 1;
      shadow.pos.x = p.x; shadow.pos.y = brawl ? p.y - (p.air ? 0 : p.jz) : p.y + 1; shadow.opacity = brawl ? 0.5 : (p.onGround ? 0.5 : 0.25);
      // invincibilité : l'OctoCat change de couleur en arc-en-ciel, laisse une traînée et clignote quand elle s'épuise
      var starOn = p.star > 0;
      if (starOn) {
        var hue = (time * 1.7) % 1;
        rainbow.color = rgb(rainbowHex(hue, 0.9)); rainbow.opacity = player.opacity * 0.62; rainbow.pos.x = player.pos.x; rainbow.pos.y = player.pos.y; rainbow.flipX = player.flipX;
        if (rainbow.__anim !== player.__anim) { rainbow.__anim = player.__anim; rainbow.play(player.__anim || "idle"); }
        aura.color = rgb(rainbowHex(hue + 0.45, 0.75)); aura.pos.x = p.x; aura.pos.y = py - 16; aura.opacity = 0.42 + 0.12 * Math.sin(time * 14);
        trailT -= dt;
        if (trailT <= 0) { trailT = 0.045; burst(p.x, py - 14, [rainbowHex(hue, 0.8), rainbowHex(hue + 0.33, 0.8), "#ffffff"], 2, 0.35); }
        if (p.star < 1.6 && Math.floor(time * 10) % 2) { player.opacity = 0.5; rainbow.opacity = 0.3; }
      } else if (starWas) { rainbow.opacity = 0; aura.opacity = 0; }
      starWas = starOn;
      var powerOn = p.power > 0 && !starOn;
      if (powerOn) { aura.color = rgb("#ffd54a"); aura.pos.x = p.x; aura.pos.y = py - 16; aura.opacity = 0.22 + 0.08 * Math.sin(time * 9); } else if (!starOn) aura.opacity = 0;
      starTxt.opacity = starOn ? 1 : 0; starBar.opacity = starOn ? 1 : 0;
      if (starOn) { starBar.width = Math.max(1, 60 * p.star / Sim.CFG.starTime); starBar.color = rgb(rainbowHex(time * 1.7, 0.8)); starTxt.color = rgb(rainbowHex(time * 1.7 + 0.2, 0.6)); }
      powTxt.opacity = p.power > 0 ? 1 : 0; powBar.opacity = p.power > 0 ? 1 : 0;
      if (p.power > 0) powBar.width = Math.max(1, 60 * p.power / Sim.CFG.powerTime);
      if (light) { light.pos.x = p.x; light.pos.y = p.y - 24; light.opacity = 0.2 + 0.04 * Math.sin(time * 9); }

      var dg = sim.dog, dRun = Math.abs(dg.vx) > 30, dAnim = dRun ? "run" : "idle";
      laita.pos.x = dg.x; laita.pos.y = dg.y - (dRun ? Math.abs(Math.sin(time * 16)) * 2 : 0);
      laita.flipX = dg.face < 0;
      if (brawl) laita.z = 6.03 + dg.y / 400;
      if (laita.__anim !== dAnim) { laita.__anim = dAnim; laita.play(dAnim); }
      dogShadow.pos.x = dg.x; dogShadow.pos.y = dg.y + 1;
      var dReady = dg.cd <= 0 && dg.state === "follow";
      dogBar.width = Math.max(1, 60 * (dg.state === "follow" ? 1 - Math.min(1, dg.cd / Sim.CFG.dogCooldown) : 0));
      dogBar.color = rgb(dReady ? "#7ee787" : "#8b949e");
      dogTxt.text = dReady ? "LAITA PRETE" : "LAITA"; dogTxt.color = rgb(dReady ? "#7ee787" : "#c9d1d9");

      syncEnemies();
      if (brawl) syncBrawlWorld(); else syncPlatformWorld(time);
      terminalObj.opacity = 0.85 + 0.15 * Math.sin(time * 5);

      // caméra
      var c = camTarget();
      cam.x += (c.x - cam.x) * Math.min(1, 6 * dt); cam.y += (c.y - cam.y) * Math.min(1, 5 * dt);
      k.camPos(Math.round(cam.x * 2) / 2, Math.round(cam.y * 2) / 2);
      skyLayer(cam.x, cam.y); landLayer(cam.x, cam.y);
      if (cave) {
        var inRoom = sim.secret.inRoom;
        cave.opacity = inRoom ? 1 : 0; curtain.opacity = inRoom ? 1 : 0;
        sparkT -= dt; // un léger scintillement au-dessus du trou secret (pour les curieux)
        var gcx = (sim.secret.gapL + sim.secret.gapR) / 2;
        if (!inRoom && sparkT <= 0 && Math.abs(p.x - gcx) < 380) { sparkT = 0.9; burst(gcx + (Math.random() - 0.5) * 40, worldH - 14, ["#ffd54a", "#fff4c2"], 2, 0.35); }
      }
      clouds.forEach(function (cl) { cl.x -= cl.sp * dt; if (cl.x < -140) cl.x = VW + 40; cl.o.pos.x = cl.x; });

      // interface
      heartObjs.forEach(function (o, i) { o.opacity = i < p.hp ? 1 : 0.2; });
      bitsTxt.text = "PIECES " + sim.stats.bits + "/" + sim.stats.bitsTotal;
      progress.width = Math.max(1, VW * sim.progress());
      var introT = Math.max(0, 2.6 - time);
      banner.opacity = Math.min(1, introT); sub.opacity = Math.min(1, introT); plate.opacity = 0.5 * Math.min(1, introT);
      hint.opacity = (S && !S.get("hints")) || pad.visible() ? 0 : time < 9 ? 0.9 : Math.max(0, 0.9 - (time - 9) * 0.5); // avec les boutons à l'écran, l'aide est inutile
      toastT = Math.max(0, toastT - dt); toast.opacity = Math.min(1, toastT * 2);
      hurtFlash = Math.max(0, hurtFlash - dt); flash.opacity = hurtFlash * 0.35;
      goTxt.opacity = brawl && sim.goT > 0 ? (Math.floor(time * 3) % 2 ? 1 : 0.2) : 0;

      // musique : tension quand un danger approche ; combat épique pendant les vagues
      mt += dt;
      if (mt > 0.25) {
        mt = 0;
        var m = music();
        if (brawl) { m.setBattle(sim.battle()); m.setMood(sim.battle() ? 0 : clamp(1 - sim.nearestThreat() / 300, 0, 1) * 0.45); }
        else m.setMood(clamp(1 - sim.nearestThreat() / 240, 0, 1) * 0.55);
      }

      // « passer le trajet » apparaît après plusieurs échecs
      if (!skipBtn && (sim.stats.deaths >= (brawl ? 2 : 3) || (S && S.get("skipAlways")))) {
        skipBtn = el("button", "octo-skip", "Passer le trajet ▸");
        skipBtn.type = "button";
        skipBtn.addEventListener("click", function () { ctrl.skip(); });
        host.appendChild(skipBtn);
      }
    });

    var ctrl = {
      sim: sim, input: input, k: k,
      skip: function () { if (!ended) { ended = true; endT = 0.5; } },
      destroy: function () {
        destroyed = true; input.destroy(); pad.destroy();
        if (skipBtn) skipBtn.remove();
        music().setBattle(false);
        if (window.OctoPlay.current === ctrl) window.OctoPlay.current = null;
      }
    };
    window.OctoPlay.current = ctrl;
    return ctrl;
  }

  window.OctoPlay = { createRun: createRun, THEMES: THEMES, current: null };
})();
