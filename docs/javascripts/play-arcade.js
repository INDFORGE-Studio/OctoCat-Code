/* OctoCat-Code — Les trajets d'arcade : L'INVASION (monde de JavaScript) et LE SERPENT D'OCTO (monde de Python).
 *
 * Ils remplacent le Double Dragon des niveaux 2, 6 et 10 dans les deux nouveaux mondes. La simulation est pure (sim-space.js, sim-snake.js) ; ce fichier
 * dessine et fait vivre une scène de plus : fond, personnages, effets, interface (cœurs, pièces, aide des touches, boutons tactiles), musique, fin de trajet.
 * Les touches viennent des réglages (menu ⚙), comme pour tous les trajets : flèches / ZQSD pour bouger, X ou clic gauche pour tirer, V ou clic droit pour Laita.
 *
 *   OctoPlay.modes.invaders(k, h, def, hooks) / OctoPlay.modes.snake(k, h, def, hooks)  →  { sim, input, k, skip(), destroy() }, comme OctoPlay.createRun
 */
(function () {
  "use strict";

  var K = window.OctoPlay.kit, Sim = window.OctoSim, clamp = K.clamp, el = K.el, plain = K.plain, music = K.music, settings = K.settings;

  var SFX = {
    laser: "laser", kill: "kill", hit: "hit", hurt: "hurt", bit: "bit", heart: "heart", star: "star", power: "power", bark: "bark", scare: "scare",
    wave: "wave", clear: "finish", finish: "finish", boom: "boom", bomb: "bomb", ufo: "ufo", bump: "hurt", self: "hurt", die: "hurt", shield: "crate-hit", breach: "hurt"
  };

  /**
   * Le cadre commun : interface, entrées, pause, musique, fin de trajet. `cfg` décrit le mode :
   *   sim, hint(S) → texte d'aide, pad { jump, attack, attackLabel }, throwBtn, build(ctx) → { sync(dt, t), event(ev), destroy() }
   */
  function frame(k, h, def, hooks, cfg) {
    var sim = cfg.sim, VW = k.width(), VH = k.height(), rgb = function (hex) { return k.Color.fromHex(hex); };
    var input = K.createInput(true), host = document.querySelector(".octo-hero") || document.body;
    var pad = K.createPad(host, input, true, !!cfg.throwBtn, cfg.pad);
    var ended = false, destroyed = false, endT = 0, time = 0, mt = 0, hurtFlash = 0, toastT = 0, skipBtn = null, banked = false, hintVer = -1;
    k.camPos(VW / 2, VH / 2);

    /* ----- interface fixe ----- */
    var hpMax = sim.player.hpMax, hearts = [], i;
    for (i = 0; i < hpMax; i++) hearts.push(k.add([k.sprite("heart"), k.pos(10 + i * 20, 8), k.scale(1.7), k.fixed(), k.z(31)]));
    var bitsTxt = k.add([k.text("PIECES 0/" + sim.stats.bitsTotal, { size: 11, font: "monospace" }), k.pos(10, 30), k.color(rgb("#e3b341")), k.fixed(), k.z(31)]);
    var progress = k.add([k.rect(1, 3), k.pos(0, 0), k.color(rgb("#3fb950")), k.fixed(), k.z(31.5)]);
    k.add([k.rect(VW, 46), k.pos(0, 0), k.color(rgb("#0d1117")), k.opacity(0.4), k.fixed(), k.z(30.5)]);
    k.add([k.sprite("vignette"), k.pos(0, 0), k.scale(VW / 600, VH / 250), k.fixed(), k.z(30)]);
    var flash = k.add([k.rect(VW + 100, VH + 100), k.pos(-50, -50), k.color(rgb("#f85149")), k.opacity(0), k.fixed(), k.z(30.4)]);
    var plate = k.add([k.rect(Math.min(VW - 20, 300), 62), k.pos(VW / 2, VH * 0.3 + 8), k.anchor("center"), k.color(rgb("#0d1117")), k.opacity(0.5), k.fixed(), k.z(31.8)]);
    var banner = k.add([k.text("NIVEAU " + def.id, { size: 22, font: "monospace" }), k.pos(VW / 2, VH * 0.3), k.anchor("center"), k.color(rgb("#ffffff")), k.opacity(1), k.fixed(), k.z(32)]);
    var sub = k.add([k.text(plain(def.title), { size: 11, font: "monospace" }), k.pos(VW / 2, VH * 0.3 + 22), k.anchor("center"), k.color(rgb("#ffe08a")), k.opacity(1), k.fixed(), k.z(32)]);
    var toast = k.add([k.text("", { size: 14, font: "monospace" }), k.pos(VW / 2, VH * 0.46), k.anchor("center"), k.color(rgb("#ffffff")), k.opacity(0), k.fixed(), k.z(32)]);
    var hint = k.add([k.text(" ", { size: 9, font: "monospace" }), k.pos(VW / 2, VH - 12), k.anchor("center"), k.color(rgb("#e6edf3")), k.opacity(0.9), k.fixed(), k.z(31)]);
    var dogTxt = k.add([k.text("LAITA", { size: 9, font: "monospace" }), k.pos(10, VH - 38), k.color(rgb("#ffffff")), k.opacity(0.9), k.fixed(), k.z(31)]);
    k.add([k.rect(60, 4), k.pos(10, VH - 27), k.color(rgb("#0d1117")), k.opacity(0.6), k.fixed(), k.z(31)]);
    var dogBar = k.add([k.rect(60, 4), k.pos(10, VH - 27), k.color(rgb("#7ee787")), k.fixed(), k.z(31.1)]);
    var starTxt = k.add([k.text("INVINCIBLE", { size: 9, font: "monospace" }), k.pos(10, 48), k.color(rgb("#ffffff")), k.opacity(0), k.fixed(), k.z(31)]);
    var starBar = k.add([k.rect(60, 4), k.pos(10, 59), k.color(rgb("#ffffff")), k.opacity(0), k.fixed(), k.z(31)]);
    var powTxt = k.add([k.text("TIR EN EVENTAIL", { size: 9, font: "monospace" }), k.pos(10, 66), k.color(rgb("#ffd54a")), k.opacity(0), k.fixed(), k.z(31)]);
    var powBar = k.add([k.rect(60, 4), k.pos(10, 77), k.color(rgb("#ffd54a")), k.opacity(0), k.fixed(), k.z(31)]);

    function refreshHint() {
      var S = settings(), txt = S ? cfg.hint(S) : "", sz = 9;
      try { while (sz > 6 && k.formatText({ text: txt, size: sz, font: "monospace" }).width > VW - 12) sz--; } catch { /* mesure indisponible */ }
      hint.text = txt; hint.textSize = sz;
    }
    function say(str, color) { toast.text = str; toast.color = rgb(color || "#ffffff"); toastT = 1.2; }
    function pop(x, y, str, color, size) {
      var t = k.add([k.text(str, { size: size || 10, font: "monospace" }), k.pos(x, y), k.anchor("center"), k.color(rgb(color || "#ffffff")), k.opacity(1), k.z(16)]), age = 0;
      t.onUpdate(function () { age += k.dt(); t.pos.y -= 28 * k.dt(); t.opacity = Math.max(0, 1 - age / 0.9); if (age >= 0.9) t.destroy(); });
    }
    function burst(x, y, colors, n, power) {
      for (var j = 0; j < n; j++) {
        (function (jj) {
          var pw = power || 1, vx = k.rand(-110, 110) * pw, vy = k.rand(-190, -30) * pw, life = k.rand(0.35, 0.7), age = 0;
          var pcl = k.add([k.rect(3, 3), k.pos(x, y), k.color(rgb(colors[jj % colors.length])), k.opacity(1), k.z(15)]);
          pcl.onUpdate(function () { age += k.dt(); vy += 520 * k.dt(); pcl.pos.x += vx * k.dt(); pcl.pos.y += vy * k.dt(); pcl.opacity = Math.max(0, 1 - age / life); if (age >= life) pcl.destroy(); });
        })(j);
      }
    }
    /** Anneau qui s'élargit (aboiement de Laita, explosion du gardien). */
    function ring(x, y, color, size, dur) {
      var o = k.add([k.sprite("glow"), k.pos(x, y), k.anchor("center"), k.scale(0.4), k.color(rgb(color)), k.opacity(0.8), k.z(14)]), age = 0;
      o.onUpdate(function () { age += k.dt(); var u = age / dur; o.scale = k.vec2(0.4 + u * size, 0.4 + u * size); o.opacity = 0.8 * (1 - u); if (u >= 1) o.destroy(); });
    }

    var ctx = { k: k, h: h, rgb: rgb, VW: VW, VH: VH, sim: sim, input: input, burst: burst, pop: pop, say: say, ring: ring, def: def };
    var mode = cfg.build(ctx);

    function bankCoins() { if (banked || !window.OctoProgress) return 0; banked = true; return window.OctoProgress.bank(def.id, sim.stats.bits); }
    function finishRun() {
      if (ended) return;
      ended = true; endT = 0;
      var gain = bankCoins();
      say(gain ? "VICTOIRE !  +" + gain + " PIECES" : "VICTOIRE !", "#7ee787");
      music().sfx("finish");
      burst(VW / 2, VH / 2, ["#3fb950", "#39c5cf", "#ffffff", "#bc8cff", "#ffd54a"], 40, 1.4);
    }
    function handle(ev) {
      var m = music();
      if (SFX[ev.t]) m.sfx(SFX[ev.t]);
      if (ev.t === "hurt") { hurtFlash = 0.35; k.shake(7); }
      else if (ev.t === "die") { hurtFlash = 0.6; k.shake(10); say("K.O. !  TOUT RECOMMENCE", "#f85149"); }
      else if (ev.t === "restart") say("TOUT RECOMMENCE", "#f85149");
      else if (ev.t === "heart") say("+ VIE", "#ff9aa0");
      else if (ev.t === "star") say("INVINCIBLE !", "#ffffff");
      else if (ev.t === "power") say("TIR EN EVENTAIL !", "#ffd54a");
      if (mode.event) mode.event(ev);
    }

    k.onUpdate(function () {
      if (destroyed) return;
      var dt = Math.min(k.dt(), 1 / 20), S = settings();
      time += dt;
      if (S && S.version() !== hintVer) { hintVer = S.version(); refreshHint(); pad.refresh(); }
      sim.relax = !!(S && S.get("relax"));
      if (!ended) {
        if (!K.menuOpen()) sim.step(input.get(), dt); // le menu ⚙ met la partie en pause
        sim.events.forEach(handle);
        sim.events.length = 0;
        if (sim.finished) finishRun();
      } else {
        endT += dt;
        if (endT > 1.1) { destroyed = true; bankCoins(); hooks.finish(); return; }
      }
      mode.sync(dt, time);
      var p = sim.player;
      hearts.forEach(function (o, j) { o.opacity = j < p.hp ? 1 : 0.2; });
      bitsTxt.text = "PIECES " + sim.stats.bits + "/" + sim.stats.bitsTotal;
      progress.width = Math.max(1, VW * sim.progress());
      var introT = Math.max(0, 2.6 - time);
      banner.opacity = Math.min(1, introT); sub.opacity = Math.min(1, introT); plate.opacity = 0.5 * Math.min(1, introT);
      hint.opacity = (S && !S.get("hints")) || pad.visible() ? 0 : time < 9 ? 0.9 : Math.max(0, 0.9 - (time - 9) * 0.5);
      toastT = Math.max(0, toastT - dt); toast.opacity = Math.min(1, toastT * 2);
      hurtFlash = Math.max(0, hurtFlash - dt); flash.opacity = hurtFlash * 0.35;
      var dg = sim.dog, ready = dg.cd <= 0;
      dogBar.width = Math.max(1, 60 * (1 - Math.min(1, dg.cd / Sim.CFG.dogCooldown)));
      dogBar.color = rgb(ready ? "#7ee787" : "#8b949e"); dogTxt.text = ready ? "LAITA PRETE" : "LAITA"; dogTxt.color = rgb(ready ? "#7ee787" : "#c9d1d9");
      var starOn = p.star > 0, powOn = p.power > 0;
      starTxt.opacity = starOn ? 1 : 0; starBar.opacity = starOn ? 1 : 0;
      if (starOn) { starBar.width = Math.max(1, 60 * p.star / Sim.CFG.starTime); starBar.color = rgb(K.rainbowHex(time * 1.7, 0.8)); starTxt.color = rgb(K.rainbowHex(time * 1.7 + 0.2, 0.6)); }
      powTxt.opacity = powOn ? 1 : 0; powBar.opacity = powOn ? 1 : 0;
      if (powOn) powBar.width = Math.max(1, 60 * p.power / Sim.CFG.powerTime);
      // musique : combat épique pendant les vagues (et au niveau final), tension quand le danger approche
      mt += dt;
      if (mt > 0.25) {
        mt = 0;
        var m = music();
        m.setBattle(sim.battle()); m.setMood(sim.battle() ? 0 : clamp(1 - sim.nearestThreat() / 240, 0, 1) * 0.5);
      }
      if (!skipBtn && (sim.stats.deaths >= 2 || (S && S.get("skipAlways")))) {
        skipBtn = el("button", "octo-skip", "Passer le trajet ▸");
        skipBtn.type = "button";
        skipBtn.addEventListener("click", function () { ctrl.skip(); });
        host.appendChild(skipBtn);
      }
    });

    var ctrl = {
      sim: sim, input: input, k: k,
      skip: function () { if (!ended) { ended = true; endT = 0.6; } },
      destroy: function () {
        destroyed = true; input.destroy(); pad.destroy();
        if (mode.destroy) mode.destroy();
        if (skipBtn) skipBtn.remove();
        music().setBattle(false);
        if (window.OctoPlay.current === ctrl) window.OctoPlay.current = null;
      }
    };
    window.OctoPlay.current = ctrl;
    return ctrl;
  }

  /* ====================================================================
   * L'INVASION
   * ================================================================== */

  function invadersMode(k, h, def, hooks) {
    var run = def.run, VW = k.width(), VH = k.height();
    var sim = Sim.createInvaders(run, VW, VH);
    return frame(k, h, def, hooks, {
      sim: sim, throwBtn: true, pad: { jump: false, attackLabel: "TIR", attackAria: "Tirer" },
      hint: function (S) {
        var f = function (a, n) { return S.hintFor(a, n); };
        return f("left", 1) + "/" + f("right", 1) + "/" + f("up", 1) + "/" + f("down", 1) + ": PILOTER   " + f("attack", 2) + ": TIRER   " + f("dog", 2) + ": LAITA (FIGE LES ENVAHISSEURS)";
      },
      build: function (c) {
        var rgb = c.rgb, VW2 = c.VW, VH2 = c.VH, burst = c.burst, pop = c.pop, say = c.say, ring = c.ring;
        // fond : le ciel étoilé du monde (deux copies qui défilent doucement) + trois couches d'étoiles à des vitesses différentes
        k.add([k.rect(VW2 + 8, VH2 + 8), k.pos(-4, -4), k.color(rgb(run.theme && window.OctoWorlds && window.OctoWorlds.themes[run.theme] ? window.OctoWorlds.themes[run.theme].sky : "#05030f")), k.fixed(), k.z(-5)]);
        // le ciel fait 600 × 250 : on le répète (miroir) à droite, à gauche et en dessous pour couvrir tout l'écran
        [[-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].forEach(function (q) { k.add([k.sprite("sky", { flipX: q[0] !== 0, flipY: q[1] === 1 }), k.pos(q[0] * 600 + (VW2 > 600 ? (VW2 - 600) / 2 : 0), q[1] * 250), k.scale(2), k.z(-4)]); });
        var stars = [];
        for (var si = 0; si < 54; si++) {
          var layer = si % 3, sp = [10, 24, 46][layer];
          stars.push({ sp: sp, o: k.add([k.rect(layer === 2 ? 2 : 1, layer === 2 ? 3 : 2), k.pos(k.rand(0, VW2), k.rand(0, VH2)), k.color(rgb(layer === 0 ? "#8a9ad8" : layer === 1 ? "#cfe0ff" : "#ffffff")), k.opacity(layer === 0 ? 0.5 : 0.8), k.z(-3)]) });
        }
        if (run.theme === "spinv6") k.add([k.rect(VW2, VH2), k.pos(0, 0), k.color(rgb("#8a1f6a")), k.opacity(0.06), k.fixed(), k.z(-2)]);
        // ligne de danger (la formation ne doit pas descendre jusque-là)
        var dangerY = sim.h - 118;
        for (var dx0 = 0; dx0 < VW2; dx0 += 14) k.add([k.rect(7, 1), k.pos(dx0, dangerY), k.color(rgb("#f85149")), k.opacity(0.22), k.z(2)]);

        // les bunkers
        var shieldObjs = sim.shields.map(function (b) { return { b: b, o: k.add([k.rect(b.s - 1, b.s - 1), k.pos(b.x, b.y), k.anchor("center"), k.color(rgb("#7ee0ff")), k.z(6)]) }; });
        // la fusée, son pilote, sa flamme ; Laita dans sa bulle
        var ship = k.add([k.sprite("ship"), k.pos(sim.player.x, sim.player.y), k.anchor("center"), k.scale(1.25), k.z(9)]);
        var pilot = k.add([k.sprite("octo", { anim: "idle" }), k.pos(0, 0), k.anchor("center"), k.scale(0.5), k.z(9.1)]);
        var flame = k.add([k.rect(6, 10), k.pos(0, 0), k.anchor("top"), k.color(rgb("#ffb347")), k.z(8.9)]);
        var flame2 = k.add([k.rect(3, 6), k.pos(0, 0), k.anchor("top"), k.color(rgb("#fff4c2")), k.z(8.95)]);
        var aura = k.add([k.sprite("glow"), k.pos(0, 0), k.anchor("center"), k.scale(1.8), k.color(rgb("#ffffff")), k.opacity(0), k.z(8.8)]);
        var podDog = k.add([k.sprite("laita", { anim: "idle" }), k.pos(0, 0), k.anchor("center"), k.scale(0.95), k.z(8.7)]);
        var bubble = k.add([k.sprite("bubble"), k.pos(0, 0), k.anchor("center"), k.scale(1.7), k.z(8.8)]);
        var podFlame = k.add([k.rect(4, 6), k.pos(0, 0), k.anchor("top"), k.color(rgb("#9af0ff")), k.z(8.6)]);
        var objs = new Map(), bossObj = null, bossBar = null, bossBarBg = null, ufoObj = null, shotObjs = new Map(), bombObjs = new Map(), itemObjs = new Map();
        var freezeVeil = k.add([k.rect(VW2, VH2), k.pos(0, 0), k.color(rgb("#4be3ff")), k.opacity(0), k.fixed(), k.z(29)]);

        function enemyObj(e) {
          var o = k.add([k.sprite("inv-" + e.kind, { anim: "idle" }), k.pos(e.x, e.y), k.anchor("center"), k.scale(1.35), k.color(rgb(e.coin ? "#ffe9a0" : "#ffffff")), k.opacity(1), k.z(8)]);
          if (e.coin) { o.__glow = k.add([k.sprite("glow"), k.pos(e.x, e.y), k.anchor("center"), k.scale(1.2), k.color(rgb("#ffd54a")), k.opacity(0.4), k.z(7.9)]); o.__bit = k.add([k.sprite("bit"), k.pos(e.x, e.y - 15), k.anchor("center"), k.scale(0.9), k.z(8.1)]); }
          return o;
        }
        return {
          sync: function (dt, t) {
            var p = sim.player;
            stars.forEach(function (st) { st.o.pos.y += st.sp * dt; if (st.o.pos.y > VH2) { st.o.pos.y = -3; st.o.pos.x = k.rand(0, VW2); } });
            // la fusée
            var bank = sim.player.tilt * 0.18;
            ship.pos.x = p.x; ship.pos.y = p.y - 4; ship.angle = bank * 57;
            pilot.pos.x = p.x; pilot.pos.y = p.y - 4 + 1.5;
            flame.pos.x = p.x; flame.pos.y = p.y + 8; flame.height = 7 + 5 * Math.abs(Math.sin(t * 40)); flame2.pos.x = p.x; flame2.pos.y = p.y + 8; flame2.height = 4 + 3 * Math.abs(Math.sin(t * 52));
            var blink = p.inv > 0 && Math.floor(t * 18) % 2 === 0;
            ship.opacity = blink ? 0.35 : 1; pilot.opacity = blink ? 0.35 : 1;
            var rainbow = p.star > 0;
            if (rainbow) { aura.color = rgb(K.rainbowHex(t * 1.7, 0.8)); aura.opacity = 0.42 + 0.12 * Math.sin(t * 14); ship.color = rgb(K.rainbowHex(t * 1.7 + 0.3, 0.35)); }
            else { aura.opacity = p.power > 0 ? 0.25 : 0; aura.color = rgb("#ffd54a"); ship.color = rgb("#ffffff"); }
            aura.pos.x = p.x; aura.pos.y = p.y - 4;
            var dg = sim.dog;
            podDog.pos.x = dg.x; podDog.pos.y = dg.y - 2; bubble.pos.x = dg.x; bubble.pos.y = dg.y - 1; podFlame.pos.x = dg.x; podFlame.pos.y = dg.y + 7; podFlame.height = 4 + 3 * Math.abs(Math.sin(t * 30));
            // les envahisseurs
            var seen = new Set();
            sim.enemies.forEach(function (e) {
              if (!e.alive) return;
              seen.add(e);
              var o = objs.get(e);
              if (!o) { o = enemyObj(e); objs.set(e, o); }
              var frozen = sim.freeze > 0;
              o.pos.x = e.x + (frozen ? Math.sin(t * 60 + e.c) * 1 : 0); o.pos.y = e.y;
              o.color = e.flash > 0 ? rgb("#ffffff") : frozen ? rgb("#9af0ff") : rgb(e.coin ? "#ffe9a0" : "#ffffff");
              if (o.__glow) { o.__glow.pos.x = e.x; o.__glow.pos.y = e.y; o.__glow.opacity = 0.3 + 0.15 * Math.sin(t * 6 + e.c); }
              if (o.__bit) { o.__bit.pos.x = e.x; o.__bit.pos.y = e.y - 14 + Math.sin(t * 5 + e.c) * 1.5; }
            });
            objs.forEach(function (o, e) { if (!seen.has(e)) { if (o.__glow) o.__glow.destroy(); if (o.__bit) o.__bit.destroy(); o.destroy(); objs.delete(e); } });
            // le gardien
            var B = sim.boss;
            if (B && B.alive) {
              if (!bossObj) {
                bossObj = k.add([k.sprite("inv-mother", { anim: "idle" }), k.pos(B.x, B.y), k.anchor("center"), k.scale(1), k.z(8.2)]);
                bossBarBg = k.add([k.rect(204, 8), k.pos(VW2 / 2, 56), k.anchor("center"), k.color(rgb("#0d1117")), k.opacity(0.7), k.fixed(), k.z(31)]);
                bossBar = k.add([k.rect(200, 4), k.pos(VW2 / 2 - 100, 54), k.color(rgb("#f85149")), k.fixed(), k.z(31.1)]);
              }
              bossObj.pos.x = B.x + (sim.freeze > 0 ? Math.sin(t * 60) : 0); bossObj.pos.y = B.y; bossObj.color = B.flash > 0 ? rgb("#ffffff") : sim.freeze > 0 ? rgb("#9af0ff") : rgb("#ffffff");
              bossBar.width = Math.max(1, 200 * B.hp / B.maxHp);
            } else if (bossObj) { bossObj.destroy(); bossBar.destroy(); bossBarBg.destroy(); bossObj = null; }
            // la soucoupe-mystère
            var U = sim.ufo;
            if (U) { if (!ufoObj) ufoObj = k.add([k.sprite("inv-ufo", { anim: "idle" }), k.pos(U.x, U.y), k.anchor("center"), k.scale(1.3), k.z(8.3)]); ufoObj.pos.x = U.x; ufoObj.pos.y = U.y + Math.sin(t * 6) * 1.5; ufoObj.color = U.flash > 0 ? rgb("#ffffff") : rgb("#ffffff"); }
            else if (ufoObj) { ufoObj.destroy(); ufoObj = null; }
            // tirs, bombes, butin
            function syncSet(list, map, make, place) {
              var live = new Set();
              list.forEach(function (it) { live.add(it); var o = map.get(it); if (!o) { o = make(it); map.set(it, o); } place(o, it); });
              map.forEach(function (o, it) { if (!live.has(it)) { o.destroy(); map.delete(it); } });
            }
            syncSet(sim.bullets, shotObjs, function (b) { return k.add([k.sprite(b.power ? "laser-p" : "laser"), k.pos(b.x, b.y), k.anchor("center"), k.scale(1.4), k.z(9.5)]); }, function (o, b) { o.pos.x = b.x; o.pos.y = b.y; });
            syncSet(sim.bombs, bombObjs, function (b) { return k.add([k.sprite("bomb"), k.pos(b.x, b.y), k.anchor("center"), k.scale(1.5), k.z(9.4)]); }, function (o, b) { o.pos.x = b.x; o.pos.y = b.y; o.flipX = Math.floor(t * 12) % 2 === 0; });
            syncSet(sim.items, itemObjs, function (it) { return k.add([k.sprite(it.kind === "power" ? "power" : "heart"), k.pos(it.x, it.y), k.anchor("center"), k.scale(it.kind === "power" ? 1.5 : 1.6), k.z(9)]); }, function (o, it) { o.pos.x = it.x; o.pos.y = it.y; });
            // bunkers : plus ils sont abîmés, plus ils rougissent
            shieldObjs.forEach(function (q) { q.o.opacity = q.b.alive ? 1 : 0; q.o.color = rgb(q.b.hp >= 2 ? "#7ee0ff" : "#ff9aa0"); });
            freezeVeil.opacity = sim.freeze > 0 ? 0.1 + 0.04 * Math.sin(t * 20) : 0;
          },
          event: function (ev) {
            switch (ev.t) {
              case "kill": burst(ev.x, ev.y, ["#ffffff", "#ffd54a", "#ff9a5a", "#e054c0", "#4be3ff"], 18, 0.9); k.shake(3); break;
              case "boom": burst(ev.x, ev.y, ["#ffffff", "#ffd54a", "#ff5d73", "#bc8cff"], 60, 1.8); ring(ev.x, ev.y, "#ffd54a", 14, 0.9); k.shake(14); say("GARDIEN VAINCU !", "#7ee787"); break;
              case "hit": burst(ev.x, ev.y, ["#ffffff", "#ffd54a"], 4, 0.5); break;
              case "laser": burst(ev.x, ev.y + 4, ["#4be3ff", "#ffffff"], 2, 0.3); break;
              case "bit": pop(ev.x, ev.y, "+1", "#ffd54a", 12); burst(ev.x, ev.y, ["#ffd54a", "#fff4c2"], 8, 0.7); break;
              case "bark": ring(sim.player.x, sim.player.y, "#9af0ff", 22, 0.8); pop(ev.x, ev.y - 12, "OUAF !", "#ffffff", 10); say("LAITA FIGE TOUT LE MONDE !", "#9af0ff"); break;
              case "scare": pop(ev.x, ev.y, "!", "#ffd54a", 10); break;
              case "wave": say("VAGUE " + (ev.extra + 1) + " / " + run.waves.length, "#ff9aa0"); k.shake(4); break;
              case "breach": say("ILS SONT TROP BAS !", "#f85149"); break;
              case "ufo": pop(ev.x < 0 ? 30 : VW2 - 30, 34, "SOUCOUPE !", "#ff6ac1", 9); break;
              case "shield": burst(ev.x, ev.y, ["#7ee0ff", "#ffffff"], 3, 0.4); break;
              case "heart": case "star": case "power": burst(ev.x, ev.y, ["#ffffff", "#ffd54a", "#ff9aa0"], 14, 0.9); break;
              default: break;
            }
          }
        };
      }
    });
  }

  /* ====================================================================
   * LE SERPENT D'OCTO
   * ================================================================== */

  var WORD = "OCTOCAT";
  var BODY = [["#8957e5", "#b392f0"], ["#2f6fdb", "#86b6ff"], ["#e3a008", "#ffd966"], ["#2b2f86", "#6a72e0"], ["#8a8a98", "#d8dae8"]]; // couleurs des tentacules selon le costume

  function snakeMode(k, h, def, hooks) {
    var run = def.run, VW = k.width(), VH = k.height();
    var sim = Sim.createSnake(run);
    var cs = clamp(Math.floor(Math.min((VW - 16) / sim.cols, (VH - 74) / sim.rows)), 10, 20); // taille d'une case : l'arène tient toujours à l'écran
    var AW = cs * sim.cols, AH = cs * sim.rows, ox = Math.floor((VW - AW) / 2), oy = Math.floor(48 + (VH - 48 - 26 - AH) / 2);
    return frame(k, h, def, hooks, {
      sim: sim, throwBtn: false, pad: { jump: false, attack: false },
      hint: function (S) {
        var f = function (a, n) { return S.hintFor(a, n); };
        return f("left", 1) + "/" + f("right", 1) + "/" + f("up", 1) + "/" + f("down", 1) + ": DIRIGER   " + f("dog", 2) + ": LAITA (FIGE LES GLITCH)";
      },
      build: function (c) {
        var rgb = c.rgb, burst = c.burst, pop = c.pop, say = c.say, ring = c.ring, theme = (window.OctoWorlds && window.OctoWorlds.themes[run.theme]) || { floor: "#1a3a3a", grid: "#245050", edge: "#3fb970", sky: "#0f2a2a" };
        var skin = window.OctoProgress ? window.OctoProgress.skin() : 0, pal = BODY[skin] || BODY[0];
        var bg = k.add([k.rect(VW + 8, VH + 8), k.pos(-4, -4), k.color(rgb(theme.sky || "#0f2a2a")), k.fixed(), k.z(-5)]);
        void bg;
        // lucioles qui flottent derrière l'arène
        var flies = [];
        for (var fi = 0; fi < 26; fi++) flies.push({ x: k.rand(0, VW), y: k.rand(0, VH), p: k.rand(0, 6.28), sp: k.rand(0.3, 0.9), o: k.add([k.rect(2, 2), k.pos(0, 0), k.color(rgb(theme.edge || "#7ee787")), k.opacity(0.4), k.z(-3)]) });
        // le sol de l'arène : damier, bordure qui brille (une seule fonction de dessin)
        var floorDraw = k.add([k.pos(0, 0), k.z(1), {
          draw: function () {
            var x, y;
            k.drawRect({ pos: k.vec2(ox - 4, oy - 4), width: AW + 8, height: AH + 8, color: rgb(theme.edge || "#3fb970"), opacity: 0.35 + 0.1 * Math.sin(k.time() * 3), radius: 4 });
            k.drawRect({ pos: k.vec2(ox - 2, oy - 2), width: AW + 4, height: AH + 4, color: rgb("#0a0f14"), radius: 3 });
            for (y = 0; y < sim.rows; y++) for (x = 0; x < sim.cols; x++) k.drawRect({ pos: k.vec2(ox + x * cs, oy + y * cs), width: cs, height: cs, color: rgb((x + y) % 2 ? theme.floor : theme.grid) });
          }
        }]);
        void floorDraw;
        // les pierres
        sim.wallList.forEach(function (w, wi) { k.add([k.sprite("rock"), k.pos(ox + (w.x + 0.5) * cs, oy + (w.y + 0.95) * cs), k.anchor("bot"), k.scale(cs * 1.12 / 14), k.z(3 + w.y / 100 + (wi % 2) * 0.001)]); });
        var coinObjs = new Map(), heartObjs = new Map(), starObjs = new Map(), glitchObjs = new Map();
        function cx(cell) { return ox + (cell + 0.5) * cs; }
        function cyy(cell) { return oy + (cell + 0.5) * cs; }
        var head = k.add([k.sprite("octo", { anim: "idle" }), k.pos(0, 0), k.anchor("center"), k.scale(cs * 1.7 / 24), k.z(6)]);
        var dogObj = k.add([k.sprite("laita", { anim: "run" }), k.pos(0, 0), k.anchor("center"), k.scale(cs * 1.7 / 24), k.z(5.6)]);
        var aura = k.add([k.sprite("glow"), k.pos(0, 0), k.anchor("center"), k.scale(cs / 12), k.color(rgb("#ffffff")), k.opacity(0), k.z(5.8)]);
        var freezeVeil = k.add([k.rect(VW, VH), k.pos(0, 0), k.color(rgb("#4be3ff")), k.opacity(0), k.fixed(), k.z(29)]);
        var bodyDraw = k.add([k.pos(0, 0), k.z(5), {
          draw: function () {
            var b = sim.body, n = b.length, fr = sim.frac(), i2, rainbow = sim.player.star > 0;
            for (i2 = n - 1; i2 >= 1; i2--) { // du bout de la file jusqu'à la tête (la tête est un sprite)
              var cur = b[i2], prv = i2 < n - 1 ? b[i2 + 1] : (sim.tailPrev || cur), px = cx(cur.x), py = cyy(cur.y);
              if (Math.abs(prv.x - cur.x) <= 1 && Math.abs(prv.y - cur.y) <= 1) { px = cx(prv.x + (cur.x - prv.x) * fr); py = cyy(prv.y + (cur.y - prv.y) * fr); }
              var col = rainbow ? rgb(K.rainbowHex(k.time() * 1.7 + i2 * 0.09, 0.7)) : rgb(i2 % 2 ? pal[0] : pal[1]);
              var sz = cs * (0.92 - Math.min(0.2, (i2 / Math.max(1, n)) * 0.2)), op = sim.player.inv > 0 && Math.floor(k.time() * 18) % 2 === 0 ? 0.45 : 1;
              k.drawRect({ pos: k.vec2(px, py), width: sz + 2, height: sz + 2, anchor: "center", color: rgb("#1a0f3a"), radius: 4, opacity: op });
              k.drawRect({ pos: k.vec2(px, py), width: sz, height: sz, anchor: "center", color: col, radius: 4, opacity: op });
              k.drawText({ text: WORD.charAt((i2 - 1) % WORD.length), size: Math.max(7, cs * 0.62), pos: k.vec2(px, py + 0.5), anchor: "center", color: rgb("#1a0f3a"), font: "monospace", opacity: op });
            }
          }
        }]);
        void bodyDraw;
        function bob(list, map, make, place) {
          var live = new Set();
          list.forEach(function (it) { if (it.got) return; live.add(it); var o = map.get(it); if (!o) { o = make(it); map.set(it, o); } place(o, it); });
          map.forEach(function (o, it) { if (!live.has(it)) { o.destroy(); map.delete(it); } });
        }
        return {
          sync: function (dt, t) {
            var p = sim.player, hd = sim.body[0], prv = sim.body[1] || hd, fr = sim.frac(), px = cx(hd.x), py = cyy(hd.y);
            if (Math.abs(prv.x - hd.x) <= 1 && Math.abs(prv.y - hd.y) <= 1) { px = cx(prv.x + (hd.x - prv.x) * fr); py = cyy(prv.y + (hd.y - prv.y) * fr); }
            head.pos.x = px; head.pos.y = py - cs * 0.15; head.flipX = sim.dir[0] < 0 || (sim.dir[0] === 0 && p.facing < 0);
            head.opacity = p.inv > 0 && Math.floor(t * 18) % 2 === 0 ? 0.45 : 1;
            aura.pos.x = px; aura.pos.y = py; aura.opacity = p.star > 0 ? 0.5 + 0.15 * Math.sin(t * 14) : 0; aura.color = rgb(K.rainbowHex(t * 1.7, 0.8));
            var tl = sim.body[sim.body.length - 1], tp = sim.tailPrev || tl, dx2 = Math.abs(tp.x - tl.x) <= 1 && Math.abs(tp.y - tl.y) <= 1 ? tp.x + (tl.x - tp.x) * fr : tl.x, dy2 = Math.abs(tp.x - tl.x) <= 1 && Math.abs(tp.y - tl.y) <= 1 ? tp.y + (tl.y - tp.y) * fr : tl.y;
            dogObj.pos.x = cx(dx2); dogObj.pos.y = cyy(dy2) - cs * 0.1; dogObj.flipX = (sim.body.length > 1 && sim.body[sim.body.length - 2].x < tl.x && Math.abs(sim.body[sim.body.length - 2].x - tl.x) <= 1);
            flies.forEach(function (f) { f.y -= f.sp * 8 * dt; if (f.y < 0) f.y = VH; f.o.pos.x = f.x + Math.sin(t * f.sp + f.p) * 10; f.o.pos.y = f.y; f.o.opacity = 0.2 + 0.4 * Math.abs(Math.sin(t * 1.3 + f.p)); });
            bob(sim.coins, coinObjs, function () { return k.add([k.sprite("bit"), k.pos(0, 0), k.anchor("center"), k.scale(cs * 1.05 / 10), k.z(3.5)]); }, function (o, it) { o.pos.x = cx(it.x); o.pos.y = cyy(it.y) + Math.sin(t * 4 + it.x) * 1.2; });
            bob(sim.hearts, heartObjs, function () { return k.add([k.sprite("heart"), k.pos(0, 0), k.anchor("center"), k.scale(cs * 1.1 / 11), k.z(3.5)]); }, function (o, it) { o.pos.x = cx(it.x); o.pos.y = cyy(it.y) + Math.sin(t * 5 + it.y) * 1; });
            bob(sim.stars, starObjs, function () { return k.add([k.sprite("power"), k.pos(0, 0), k.anchor("center"), k.scale(cs * 1.1 / 12), k.rotate(0), k.z(3.5)]); }, function (o, it) { o.pos.x = cx(it.x); o.pos.y = cyy(it.y); o.angle += 300 * dt; });
            var live = new Set();
            sim.glitches.forEach(function (g) {
              if (!g.alive) return;
              live.add(g);
              var o = glitchObjs.get(g);
              if (!o) { o = k.add([k.sprite("glitch", { anim: "idle" }), k.pos(0, 0), k.anchor("center"), k.scale(cs * 1.4 / 24), k.z(5.5)]); glitchObjs.set(g, o); }
              o.pos.x = cx(g.x) + (sim.freeze > 0 ? Math.sin(t * 60) : 0); o.pos.y = cyy(g.y) - cs * 0.1; o.color = sim.freeze > 0 ? rgb("#9af0ff") : rgb("#ffffff"); o.flipX = g.dx < 0;
            });
            glitchObjs.forEach(function (o, g) { if (!live.has(g)) { o.destroy(); glitchObjs.delete(g); } });
            freezeVeil.opacity = sim.freeze > 0 ? 0.1 + 0.04 * Math.sin(t * 20) : 0;
          },
          event: function (ev) {
            var X = cx(ev.x), Y = cyy(ev.y);
            switch (ev.t) {
              case "bit": pop(X, Y - 6, "+1", "#ffd54a", 12); burst(X, Y, ["#ffd54a", "#fff4c2", "#b392f0"], 10, 0.8); break;
              case "bump": burst(X, Y, ["#a8747c", "#d8c0ff"], 8, 0.6); k.shake(4); break;
              case "self": pop(X, Y - 6, "AIE !", "#ff9aa0", 10); k.shake(3); break;
              case "kill": burst(X, Y, ["#ffffff", "#ffd54a", "#ff5d73", "#4be3ff"], 22, 1); k.shake(3); pop(X, Y - 8, "CROQUE !", "#7ee787", 10); break;
              case "bark": ring(X, Y, "#9af0ff", 18, 0.8); pop(X, Y - 10, "OUAF !", "#ffffff", 10); say("LAITA FIGE LES GLITCH !", "#9af0ff"); break;
              case "scare": pop(X, Y - 6, "!", "#ffd54a", 10); break;
              case "clear": say("TOUTES LES PIECES !", "#7ee787"); break;
              case "heart": case "star": burst(X, Y, ["#ffffff", "#ffd54a", "#ff9aa0"], 14, 0.9); break;
              default: break;
            }
          }
        };
      }
    });
  }

  window.OctoPlay.modes.invaders = invadersMode;
  window.OctoPlay.modes.snake = snakeMode;
})();
