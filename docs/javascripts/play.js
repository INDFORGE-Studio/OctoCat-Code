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
  function music() { return window.OctoMusic || { sfx: function () {}, setMood: function () {}, setBattle: function () {} }; }

  /* ---------- entrées : clavier + boutons tactiles ---------- */

  // Les touches viennent des réglages (menu ⚙) ; les codes sont physiques : WASD = ZQSD, valables pour tous les claviers.
  var FALLBACK_KEYS = {
    ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up",
    ArrowDown: "down", KeyS: "down", Space: "jump", KeyX: "attack", KeyJ: "attack", KeyC: "throw", KeyK: "throw", Mouse0: "attack", Mouse2: "throw"
  };
  function settings() { return window.OctoSettings || null; }
  function actionOf(code) { var S = settings(); return S ? S.lookup(code) : FALLBACK_KEYS[code] || null; }
  function menuOpen() { var S = settings(); return !!(S && S.isOpen()); }

  function createInput(brawl) {
    var kb = {}, pad = {};
    function typing(e) { return e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName); }
    function reset() { kb = {}; pad = {}; }
    function onKey(down) {
      return function (e) {
        if (menuOpen()) { if (!down) kb = {}; return; } // le menu ⚙ garde les touches pour lui
        var a = actionOf(e.code);
        if (!a || typing(e)) return;
        kb[a] = down;
        e.preventDefault();
      };
    }
    var kd = onKey(true), ku = onKey(false);
    // Souris : les boutons se lient comme des touches (par défaut clic gauche = frapper, clic droit = shuriken).
    // Seuls les clics sur le canvas comptent ; le tactile garde ses boutons à l'écran.
    function onMouse(down) {
      return function (e) {
        if (e.pointerType !== "mouse" || menuOpen()) { if (!down) kb = {}; return; }
        var a = actionOf("Mouse" + e.button);
        if (!a) return;
        if (!down) { kb[a] = false; return; }
        if (!e.target || e.target.tagName !== "CANVAS") return;
        kb[a] = true; e.preventDefault();
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
      setPad: function (a, v) { pad[a] = v; },
      get: function () {
        var j = kb.jump || pad.jump || (!brawl && (kb.up || pad.up));
        return {
          left: !!(kb.left || pad.left), right: !!(kb.right || pad.right),
          up: !!(brawl && (kb.up || pad.up)), down: !!(kb.down || pad.down),
          jump: !!j, attack: !!(kb.attack || pad.attack), throw: !!(kb.throw || pad.throw)
        };
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
    var pad = createPad(host, input, brawl, !!ab.shuriken);
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
    var landLayer = layer("land", 0.35, function (cy) { return cy + VH / 2 - 210; }, 1, theme.land);
    var clouds = [[40, 26, "cloud0", 5], [260, 54, "cloud1", 7], [430, 18, "cloud0", 4], [140, 80, "cloud1", 6]].map(function (c) {
      return { o: k.add([k.sprite(c[2]), k.pos(c[0], c[1]), k.scale(2), k.opacity(0.9), k.color(rgb(theme.skyTint || "#ffffff")), k.fixed(), k.z(0.5)]), x: c[0], sp: c[3] };
    });

    var objs = new Map(), shurikenObjs = new Map(), bitObjs = [], candleObjs = [], cpObjs = [];
    var heartObjs = [], player, shadow, terminalObj, light = null;
    var worldW = sim.w, worldH = sim.h;

    if (brawl) {
      var FLOOR_Y = 236;
      k.add([k.rect(worldW + VW * 2, 200), k.pos(-VW, FLOOR_Y), k.color(rgb(theme.floor || "#4a3a58")), k.z(4)]);
      for (var gx = -64, gi = 0; gx < worldW + 64; gx += 32, gi++) {
        k.add([k.sprite("grass" + (gi % 3)), k.pos(gx, FLOOR_Y), k.scale(2), k.color(rgb(theme.tile)), k.z(4.1)]);
      }
      // joints de pavage
      for (var px = 0; px < worldW + 64; px += 96) k.add([k.rect(2, 120), k.pos(px, FLOOR_Y + 36), k.color(rgb("#2a1f3a")), k.opacity(0.35), k.z(4.2)]);
      k.add([k.rect(worldW + VW * 2, 2), k.pos(-VW, 300), k.color(rgb("#2a1f3a")), k.opacity(0.3), k.z(4.2)]);
      props(function (i) { return { x: 90 + i * 150 + ((i * 53) % 40), y: FLOOR_Y + 6, z: 3.5 }; }, Math.floor(worldW / 150), 2.4);
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
      sim.candles.forEach(function (c) {
        var o2 = k.add([k.sprite("candle"), k.pos(c.x, c.y), k.anchor("bot"), k.scale(2), k.z(6.5)]);
        candleObjs.push({ c: c, o: o2 });
      });
      sim.bits.forEach(function (b) { bitObjs.push({ b: b, o: k.add([k.sprite("bit"), k.pos(b.x, b.y), k.anchor("center"), k.scale(1.6), k.z(6)]) }); });
      sim.checkpoints.forEach(function (c) {
        var pole = k.add([k.rect(3, 40), k.pos(c.x - 1, c.y - 40), k.color(rgb("#8b949e")), k.z(5.8)]);
        var flag = k.add([k.rect(18, 11), k.pos(c.x + 2, c.y - 40), k.color(rgb("#f85149")), k.z(5.9)]);
        cpObjs.push({ c: c, pole: pole, flag: flag });
      });
      var tm = sim.terminal;
      terminalObj = k.add([k.sprite("terminal"), k.pos(tm.x, tm.y), k.anchor("bot"), k.scale(2), k.z(6)]);
      if (theme.light) light = k.add([k.sprite("glow"), k.pos(0, 0), k.anchor("center"), k.scale(7), k.color(rgb(theme.light)), k.opacity(0.22), k.z(28.4)]);
    }

    shadow = k.add([k.sprite("glow"), k.pos(0, 0), k.anchor("center"), k.scale(0.7, 0.18), k.color(rgb("#1a1040")), k.opacity(0.55), k.z(5.9)]);
    player = k.add([k.sprite("octo", { anim: "idle" }), k.pos(sim.player.x, sim.player.y), k.anchor("bot"), k.scale(2), k.color(), k.opacity(1), k.z(9)]);

    if (theme.wash) k.add([k.rect(VW + 100, VH + 100), k.pos(-50, -50), k.color(rgb(theme.wash[0])), k.opacity(theme.wash[1]), k.fixed(), k.z(28.2)]);
    k.add([k.sprite("vignette"), k.pos(0, 0), k.scale(VW / 600, VH / 250), k.fixed(), k.z(30)]);
    k.add([k.rect(VW, 46), k.pos(0, 0), k.color(rgb("#0d1117")), k.opacity(0.4), k.fixed(), k.z(30.5)]);
    var flash = k.add([k.rect(VW + 100, VH + 100), k.pos(-50, -50), k.color(rgb("#f85149")), k.opacity(0), k.fixed(), k.z(30.4)]);

    /* ----- interface fixe ----- */
    var hpMax = brawl ? sim.player.hpMax : Sim.CFG.hpMax;
    for (var hi = 0; hi < hpMax; hi++) heartObjs.push(k.add([k.sprite("heart"), k.pos(10 + hi * 20, 8), k.scale(1.7), k.fixed(), k.z(31)]));
    var bitsTxt = brawl ? null : k.add([k.text("BITS 0/" + sim.stats.bitsTotal, { size: 11, font: "monospace" }), k.pos(10, 30), k.color(rgb("#e3b341")), k.fixed(), k.z(31)]);
    var progress = k.add([k.rect(1, 3), k.pos(0, 0), k.color(rgb("#3fb950")), k.fixed(), k.z(31.5)]);
    var plate = k.add([k.rect(Math.min(VW - 20, 300), 62), k.pos(VW / 2, VH * 0.3 + 8), k.anchor("center"), k.color(rgb("#0d1117")), k.opacity(0.5), k.fixed(), k.z(31.8)]);
    var banner = k.add([k.text("NIVEAU " + def.id, { size: 22, font: "monospace" }), k.pos(VW / 2, VH * 0.3), k.anchor("center"), k.color(rgb("#ffffff")), k.opacity(1), k.fixed(), k.z(32)]);
    var sub = k.add([k.text(plain(def.title), { size: 11, font: "monospace" }), k.pos(VW / 2, VH * 0.3 + 22), k.anchor("center"), k.color(rgb("#ffe08a")), k.opacity(1), k.fixed(), k.z(32)]);
    // Rappel des commandes : suit les touches choisies dans le menu ⚙ (texte sans accents : police par défaut de KAPLAY)
    function hintText() {
      var S = settings();
      if (!S) return "";
      var f = function (a, n) { return S.hintFor(a, n); };
      if (brawl) return f("left", 1) + "/" + f("right", 1) + "/" + f("up", 1) + "/" + f("down", 1) + ": BOUGER   " + f("jump", 1) + ": SAUTER   " + f("attack", 2) + ": FRAPPER";
      return f("left", 1) + "/" + f("right", 1) + ": BOUGER   " + f("jump", 1) + "/" + f("up", 1) + ": SAUTER   " + f("attack", 2) + ": ATTAQUER" +
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

    var SFX = { jump: "jump", djump: "djump", land: "land", swing: "swing", hit: "hit", kill: "kill", stomp: "stomp", hurt: "hurt", bit: "bit", heart: "heart", throw: "throw", checkpoint: "checkpoint", finish: "finish", candle: "hit", die: "hurt", fall: "hurt", wave: "hurt" };

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
        case "die": case "fall": hurtFlash = 0.6; k.shake(10); say(ev.t === "fall" ? "CHUTE !" : "K.O. - ON REPREND", "#f85149"); break;
        case "bit": burst(ev.x, ev.y, ["#e3b341", "#fff4c2"], 6, 0.6); break;
        case "heart": burst(ev.x, ev.y, ["#f85149", "#ffd6d6"], 8, 0.7); say("+ VIE", "#ff9aa0"); break;
        case "checkpoint": say("POINT DE CONTROLE", "#7ee787"); break;
        case "wave": say("ATTENTION !", "#f85149"); k.shake(5); break;
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
      tx = worldW <= VW ? worldW / 2 : clamp(tx, VW / 2, worldW - VW / 2);
      ty = VH >= worldH ? worldH - VH / 2 : clamp(ty, VH / 2, worldH - VH / 2);
      return { x: tx, y: ty };
    }
    var c0 = camTarget(); cam.x = c0.x; cam.y = c0.y;
    k.camPos(cam.x, cam.y);

    /* ----- boucle ----- */
    var ENEMY_TINT = { grunt: "#ffffff", fast: "#7ee0ff", heavy: "#ffb347", walker: "#ffffff", tough: "#ffb347" };

    function syncEnemies() {
      var seen = new Set();
      sim.enemies.forEach(function (e) {
        if (e.alive === false) return;
        seen.add(e);
        var o = objs.get(e);
        if (!o) {
          if (e.type === "flyer") o = k.add([k.sprite("bat", { anim: "fly" }), k.pos(e.x, e.y), k.anchor("center"), k.scale(2), k.z(8)]);
          else {
            var sc = brawl ? (e.kind === "heavy" ? 2.8 : e.kind === "fast" ? 1.8 : 2.1) : (e.type === "tough" ? 1.9 : 1.5);
            o = k.add([k.sprite("glitch", { anim: "idle" }), k.pos(e.x, e.y), k.anchor("bot"), k.scale(sc), k.color(rgb(ENEMY_TINT[e.kind || e.type] || "#ffffff")), k.opacity(1), k.z(8)]);
            o.baseScale = sc;
          }
          objs.set(e, o);
        }
        o.pos.x = e.x; o.pos.y = e.y;
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
          }
        }
      });
      objs.forEach(function (o, e) { if (!seen.has(e)) { o.destroy(); objs.delete(e); } });
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
        if (!it.o) it.o = k.add([k.sprite("heart"), k.pos(it.x, it.y), k.anchor("center"), k.scale(1.6), k.z(6)]);
        if (it.got && it.o.exists()) it.o.destroy();
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
        if (!o) { o = k.add([k.sprite("shuriken"), k.pos(s.x, s.y), k.anchor("center"), k.scale(1.6), k.rotate(0), k.z(9.5)]); shurikenObjs.set(s, o); }
        o.pos.x = s.x; o.pos.y = s.y; o.angle += 900 * k.dt();
      });
      shurikenObjs.forEach(function (o, s) { if (!live.has(s)) { o.destroy(); shurikenObjs.delete(s); } });
    }

    function syncBrawlWorld() {
      sim.items.forEach(function (it) {
        if (!it.o) it.o = k.add([k.sprite("heart"), k.pos(it.x, it.y - 6), k.anchor("center"), k.scale(1.8), k.z(6 + it.y / 400)]);
        if (it.got && it.o.exists()) it.o.destroy();
      });
    }

    function finishRun() {
      if (ended) return;
      ended = true; endT = 0;
      say("TERMINAL ATTEINT", "#7ee787");
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
        if (endT > 1) { destroyed = true; hooks.finish(); return; }
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
      shadow.pos.x = p.x; shadow.pos.y = brawl ? p.y : p.y + 1; shadow.opacity = brawl ? 0.5 : (p.onGround ? 0.5 : 0.25);
      if (light) { light.pos.x = p.x; light.pos.y = p.y - 24; light.opacity = 0.2 + 0.04 * Math.sin(time * 9); }

      syncEnemies();
      if (brawl) syncBrawlWorld(); else syncPlatformWorld(time);
      terminalObj.opacity = 0.85 + 0.15 * Math.sin(time * 5);

      // caméra
      var c = camTarget();
      cam.x += (c.x - cam.x) * Math.min(1, 6 * dt); cam.y += (c.y - cam.y) * Math.min(1, 5 * dt);
      k.camPos(Math.round(cam.x * 2) / 2, Math.round(cam.y * 2) / 2);
      skyLayer(cam.x, cam.y); landLayer(cam.x, cam.y);
      clouds.forEach(function (cl) { cl.x -= cl.sp * dt; if (cl.x < -140) cl.x = VW + 40; cl.o.pos.x = cl.x; });

      // interface
      heartObjs.forEach(function (o, i) { o.opacity = i < p.hp ? 1 : 0.2; });
      if (bitsTxt) bitsTxt.text = "BITS " + sim.stats.bits + "/" + sim.stats.bitsTotal;
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
